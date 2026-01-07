
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  Phone, 
  Globe, 
  FileSearch, 
  ShieldCheck, 
  ExternalLink,
  MessageCircle,
  Clock,
  Info,
  Layers,
  FileText,
  History,
  CheckCircle2,
  Trash2,
  Building2,
  ChevronDown,
  X,
  Zap,
  Target,
  Mail,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  AlertCircle,
  // Fix: add missing Smartphone icon
  Smartphone
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { JobStatus, Evidence, Report, Activity, Lead } from '../types';
import WhatsAppModal from '../components/WhatsAppModal';
import EvidenceList from '../components/EvidenceList';
import ReportViewer from '../components/ReportViewer';
import { showToast } from '../components/NotificationToast';

const LeadDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    leads, 
    savedLeads,
    addJob, 
    updateJob, 
    evidence, 
    addEvidence, 
    reports, 
    setReport, 
    activities, 
    addActivity,
    updateLeadStatus
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isSurveyRunning, setIsSurveyRunning] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  
  const lead = leads.find(l => l.id === id) || savedLeads.find(l => l.id === id);

  useEffect(() => {
    if (!lead && (leads.length > 0 || savedLeads.length > 0)) {
      navigate('/app/leads');
    }
  }, [lead, leads, savedLeads, navigate]);

  if (!lead) return <div className="p-20 text-center text-gray-400">جاري تحميل البيانات...</div>;

  const leadEvidence = evidence[lead.id] || [];
  const leadReport = reports[lead.id];
  const leadActivities = activities[lead.id] || [];

  const handleRunSurvey = () => {
    setIsSurveyRunning(true);
    const jobId = Math.random().toString(36).substr(2, 9);
    
    showToast('JOB', 'بدء المسح الآلي', `جاري تحليل نشاط ${lead.companyName} الرقمي...`);

    addJob({
      id: jobId,
      type: 'SURVEY',
      status: JobStatus.RUNNING,
      progress: 0,
      message: 'بدء تحليل نشاط الشركة الرقمي...',
      createdAt: new Date().toISOString()
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(interval);
        
        const mockEvidence: Evidence[] = [
          {
            id: `ev-${Math.random().toString(36).substr(2, 5)}`,
            leadId: lead.id,
            title: `عن ${lead.companyName} - الموقع الرسمي`,
            source: lead.website || 'website.com',
            url: lead.website || '#',
            type: 'WEBSITE',
            snippet: `${lead.companyName} هي شركة رائدة متخصصة في تقديم الحلول المتكاملة في قطاع ${lead.industry} منذ أكثر من 10 سنوات...`,
            timestamp: new Date().toISOString()
          },
          {
            id: `ev-${Math.random().toString(36).substr(2, 5)}`,
            leadId: lead.id,
            title: `مراجعات العملاء على Google Maps`,
            source: 'Google Maps',
            url: '#',
            type: 'REVIEWS',
            snippet: "خدمة ممتازة واحترافية عالية في التعامل. الفريق التقني متعاون جداً وسريع الاستجابة.",
            timestamp: new Date().toISOString()
          }
        ];
        mockEvidence.forEach(ev => addEvidence(lead.id, ev));

        const mockReport: Report = {
          leadId: lead.id,
          summary: `تمثل ${lead.companyName} فرصة مبيعات مثالية نظراً لنمو نشاطها الرقمي وحاجتها لخدمات تحسين الكفاءة التقنية.`,
          lastUpdated: new Date().toISOString(),
          sections: [
            {
              title: "تحليل الاحتياج التقني",
              content: "بناءً على التقنيات المكتشفة في الموقع الإلكتروني، يظهر أن الشركة تستخدم أنظمة قديمة في إدارة العملاء، مما يجعل عرضنا للـ CRM الجديد جذاباً جداً لهم.",
              confidence: 'HIGH',
              evidenceIds: [mockEvidence[0].id]
            },
            {
              title: "سمعة الشركة ومكانتها في السوق",
              content: "تحظى الشركة بتقييمات إيجابية جداً (4.8/5) مما يدل على استقرار مالي وقدرة على الاستثمار في الأدوات الجديدة.",
              confidence: 'MEDIUM',
              evidenceIds: [mockEvidence[1].id]
            },
            {
                title: "الحالة المالية المتوقعة",
                content: "لم يتم العثور على تقارير مالية منشورة، لذا فإن القدرة الشرائية مصنفة كـ 'غير مؤكدة'.",
                confidence: 'LOW',
                evidenceIds: []
              }
          ]
        };
        setReport(lead.id, mockReport);

        addActivity(lead.id, {
          id: Math.random().toString(36).substr(2, 9),
          leadId: lead.id,
          type: 'SURVEY',
          description: 'اكتمل الفحص الآلي وصدور التقرير الذكي',
          timestamp: new Date().toISOString(),
          user: 'النظام الآلي'
        });

        updateJob(jobId, { status: JobStatus.SUCCESS, progress: 100, message: 'اكتمل المسح الآلي وصدور التقرير' });
        showToast('SUCCESS', 'اكتمل التقرير', `تم استخراج الأدلة وبناء التقرير الذكي لـ ${lead.companyName}`);
        setIsSurveyRunning(false);
        setActiveTab('report');
      } else {
        const msgs = ['البحث في السجلات التجارية...', 'تحليل الموقع الإلكتروني...', 'استخراج التقنيات المستخدمة...', 'تحليل حضور التواصل الاجتماعي...'];
        updateJob(jobId, { progress, message: msgs[Math.floor(progress / 25)] });
      }
    }, 400);
  };

  const getStatusLabel = (s: Lead['status']) => {
    switch(s) {
      case 'NEW': return 'عميل جديد';
      case 'PROSPECTED': return 'تم الفحص';
      case 'CONTACTED': return 'تم التواصل';
      case 'QUALIFIED': return 'مؤهل للبيع';
      case 'LOST': return 'مستبعد';
      default: return s;
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 group">
            <ArrowRight size={24} className="group-active:scale-90 transition-transform rtl-flip" />
          </button>
          <div className="h-20 w-20 bg-blue-600 text-white rounded-[1.75rem] flex items-center justify-center text-4xl font-black shadow-xl shadow-blue-100">
            {lead.companyName[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900">{lead.companyName}</h1>
              <div className="relative">
                <button 
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest transition-all ${
                        lead.status === 'QUALIFIED' ? 'bg-green-50 text-green-600 border-green-100' : 
                        lead.status === 'CONTACTED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-500'
                    }`}
                >
                    {getStatusLabel(lead.status)} <ChevronDown size={12} />
                </button>
                {showStatusDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                        {['NEW', 'PROSPECTED', 'CONTACTED', 'QUALIFIED', 'LOST'].map((opt) => (
                            <button 
                                key={opt}
                                onClick={() => {
                                    updateLeadStatus(lead.id, opt as any);
                                    setShowStatusDropdown(false);
                                    addActivity(lead.id, {
                                        id: Math.random().toString(36).substr(2, 9),
                                        leadId: lead.id,
                                        type: 'STATUS_CHANGE',
                                        description: `تغيير الحالة إلى: ${getStatusLabel(opt as any)}`,
                                        timestamp: new Date().toISOString(),
                                        user: 'أحمد محمد'
                                    });
                                    showToast('INFO', 'تحديث الحالة', `تم تغيير حالة العميل إلى ${getStatusLabel(opt as any)}`);
                                }}
                                className="w-full text-right px-6 py-3 text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-0"
                            >
                                {getStatusLabel(opt as any)}
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm font-bold text-blue-600">{lead.industry}</span>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1 text-sm text-gray-500 font-bold">
                <MapPin size={16} className="text-blue-500" /> {lead.city}
              </div>
              <button onClick={() => navigate(`/app/companies/C1`)} className="flex items-center gap-1.5 text-xs font-black text-gray-400 hover:text-blue-600 transition-colors group">
                <Building2 size={14} /> صفحة الشركة <ExternalLink size={10} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1"></div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            className="p-3.5 text-red-500 hover:bg-red-50 rounded-2xl transition-colors border border-gray-100 hover:border-red-100"
            title="حذف العميل"
          >
            <Trash2 size={24} />
          </button>
          <button 
            onClick={() => setShowWhatsApp(true)}
            className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-green-700 shadow-xl shadow-green-200 transition-all active:scale-95"
          >
            <MessageCircle size={24} />
            <span>تواصل الآن</span>
          </button>
          <button 
            onClick={handleRunSurvey}
            disabled={isSurveyRunning}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileSearch size={24} />
            <span>فحص آلي (Survey)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
            <h3 className="font-black text-xl text-gray-900 border-b border-gray-50 pb-4">معلومات التواصل</h3>
            <div className="space-y-8">
              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all"><Phone size={22} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">رقم الهاتف</p>
                  <p className="text-base font-black text-gray-900 tracking-wider">{lead.phone || 'غير متوفر'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all"><Globe size={22} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">الموقع الإلكتروني</p>
                  {lead.website ? (
                    <a href={lead.website} target="_blank" className="text-base font-black text-blue-600 flex items-center gap-2 hover:underline truncate">
                      {lead.website.replace(/^https?:\/\//, '')} <ExternalLink size={14} className="flex-shrink-0" />
                    </a>
                  ) : <p className="text-base font-bold text-gray-400 italic">غير متوفر</p>}
                </div>
              </div>
            </div>
            <button className="w-full py-4 bg-gray-50 text-gray-500 font-black rounded-2xl hover:bg-gray-100 transition-all text-sm border border-gray-100">تعديل البيانات</button>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <div className="relative z-10">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="font-black text-lg">تحليل ليدززز</h3>
                 <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30"><ShieldCheck size={24} className="text-blue-400" /></div>
               </div>
               <div className="flex items-baseline gap-2 mb-2">
                 <span className="text-5xl font-black">{leadReport ? '94' : '--'}</span>
                 <span className="text-lg opacity-50 font-bold">/ 100</span>
               </div>
               <p className="text-sm opacity-60 font-medium leading-relaxed mb-10">درجة جودة العميل بناءً على تطابق نشاطه الرقمي مع خدماتك.</p>
               <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-gray-400">تطابق النشاط</span>
                    <span className="text-blue-400">98%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-[98%]"></div>
                  </div>
               </div>
             </div>
             <Layers className="absolute -bottom-20 -left-20 text-white/5 rotate-12 transition-transform group-hover:scale-110 duration-1000" size={240} />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="flex bg-gray-50/50 p-2 m-4 rounded-[1.75rem] border border-gray-100">
              {[
                { id: 'overview', label: 'نظرة عامة', icon: Clock },
                { id: 'evidence', label: `الأدلة (${leadEvidence.length})`, icon: Layers },
                { id: 'report', label: 'التقرير الذكي', icon: FileText },
                { id: 'activity', label: 'السجل والنشاط', icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm font-black transition-all rounded-[1.25rem] ${
                    activeTab === tab.id 
                      ? 'bg-white text-blue-600 shadow-md border border-gray-50' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <tab.icon size={20} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-10 flex-1">
              {activeTab === 'overview' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-start gap-6 p-8 bg-blue-50/50 border border-blue-100 rounded-[2rem] relative overflow-hidden group">
                    <div className="p-4 bg-white rounded-2xl text-blue-600 shadow-xl z-10"><Info size={32} /></div>
                    <div className="z-10">
                      <h4 className="font-black text-blue-900 text-xl mb-2">رؤية المبيعات (Sales Insight)</h4>
                      <p className="text-lg text-blue-800 leading-loose font-bold">بناءً على نشاط الشركة في قطاع {lead.industry}، نوصي بالتركيز على حلول "الأتمتة" في أول رسالة. هذه الشركات غالباً ما تعاني من ضغط العمليات اليدوية في هذا الموسم.</p>
                    </div>
                    <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                      <Zap size={200} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="p-8 bg-gray-50/50 border border-gray-100 rounded-[2rem] space-y-3 hover:border-blue-200 transition-colors">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تاريخ الاكتشاف</p>
                      <p className="text-xl font-black text-gray-900">{new Date(Date.now() - 86400000).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <div className="p-8 bg-gray-50/50 border border-gray-100 rounded-[2rem] space-y-3 hover:border-blue-200 transition-colors">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">مصدر البيانات</p>
                      <p className="text-xl font-black text-gray-900 flex items-center gap-2"><Globe size={20} className="text-blue-500" /> Google Maps</p>
                    </div>
                    <div className="p-8 bg-gray-50/50 border border-gray-100 rounded-[2rem] space-y-3 hover:border-blue-200 transition-colors">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المستوى التقني</p>
                      <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-black bg-yellow-50 text-yellow-700 border border-yellow-200 uppercase">متوسط</span>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-50 space-y-6">
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                      <Sparkles size={24} className="text-blue-600" /> الفرص المقترحة
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { title: 'أتمتة العمليات', desc: 'تقليل الاعتماد على الإدخال اليدوي بنسبة 40%', icon: Zap },
                        { title: 'تحسين الربط', icon: Smartphone, desc: 'ربط الفروع بنظام موحد للبيانات' }
                      ].map((item, i) => (
                        <div key={i} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex gap-4">
                           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl h-fit"><item.icon size={20} /></div>
                           <div>
                             <p className="font-black text-gray-900">{item.title}</p>
                             <p className="text-xs text-gray-500 font-bold mt-1">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'evidence' && (
                <EvidenceList 
                    evidence={leadEvidence} 
                    onRunSurvey={handleRunSurvey} 
                    isLoading={isSurveyRunning}
                    onViewDetail={(ev) => setSelectedEvidence(ev)}
                />
              )}

              {activeTab === 'report' && (
                <ReportViewer report={leadReport} />
              )}

              {activeTab === 'activity' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-gray-900">سجل الإجراءات</h3>
                    <button className="text-sm font-black text-blue-600 hover:underline">تحميل السجل بالكامل</button>
                  </div>
                  <div className="relative before:absolute before:inset-y-0 before:right-[1.15rem] before:w-0.5 before:bg-gray-100">
                    {leadActivities.length > 0 ? (
                      leadActivities.map((act) => (
                        <div key={act.id} className="relative pr-12 pb-12 last:pb-0">
                          <div className="absolute right-0 top-1 w-10 h-10 bg-white border-2 border-blue-600 rounded-2xl flex items-center justify-center z-10 shadow-lg">
                            {act.type === 'SURVEY' ? <FileSearch size={18} className="text-blue-600" /> : <Clock size={18} className="text-blue-600" />}
                          </div>
                          <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 group hover:bg-white hover:shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-lg font-black text-gray-900">{act.description}</p>
                              <span className="text-xs text-gray-400 font-bold">{new Date(act.timestamp).toLocaleTimeString('ar-SA')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">
                                    {act.user[0]}
                                </div>
                                <p className="text-xs text-gray-500 font-bold">بواسطة: {act.user}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="relative pr-12">
                        <div className="absolute right-0 top-1 w-10 h-10 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center z-10">
                          <CheckCircle2 size={20} className="text-gray-300" />
                        </div>
                        <div className="p-2">
                          <p className="text-lg font-black text-gray-900">اكتشاف العميل</p>
                          <p className="text-sm text-gray-400 font-bold mt-1">تمت إضافة العميل لقاعدة البيانات عبر النظام الآلي.</p>
                          <span className="text-xs text-gray-300 font-bold mt-4 block">منذ ساعة • النظام الآلي</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <WhatsAppModal 
        isOpen={showWhatsApp} 
        onClose={() => setShowWhatsApp(false)} 
        leadName={lead.companyName}
        phone={lead.phone}
      />

      {selectedEvidence && (
          <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-left duration-500 flex flex-col">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Layers size={24} /></div>
                          <h3 className="text-2xl font-black text-gray-900">تفاصيل الدليل الرقمي</h3>
                      </div>
                      <button onClick={() => setSelectedEvidence(null)} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all">
                          <X size={28} />
                      </button>
                  </div>
                  <div className="p-10 flex-1 overflow-y-auto space-y-10">
                      <div className="space-y-4">
                          <div className="flex items-center gap-3">
                              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">{selectedEvidence.type}</span>
                              <span className="text-gray-300 font-bold">•</span>
                              <span className="text-gray-400 font-bold text-sm">{selectedEvidence.source}</span>
                          </div>
                          <h4 className="text-3xl font-black text-gray-900 leading-tight">{selectedEvidence.title}</h4>
                      </div>

                      <div className="p-8 bg-gray-50 border border-gray-100 rounded-[2rem] relative">
                          <div className="absolute top-6 left-6 text-gray-100"><Layers size={64} /></div>
                          <p className="text-xl font-bold text-gray-700 leading-loose italic relative z-10">
                              "{selectedEvidence.snippet}"
                          </p>
                      </div>

                      <div className="space-y-4">
                          <h5 className="font-black text-gray-900 uppercase tracking-widest text-xs">رابط المصدر المباشر</h5>
                          <div className="p-5 border border-gray-100 rounded-2xl flex items-center justify-between bg-white group hover:border-blue-200 transition-colors">
                              <p className="text-sm font-bold text-blue-600 truncate flex-1 ml-4">{selectedEvidence.url}</p>
                              <a href={selectedEvidence.url} target="_blank" className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-100 group-hover:scale-105 transition-transform"><ExternalLink size={18} /></a>
                          </div>
                      </div>

                      <div className="pt-10 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><ShieldCheck size={20} /></div>
                              <div>
                                  <p className="text-xs font-black text-gray-900">دليل موثق</p>
                                  <p className="text-[10px] text-gray-400 font-bold">تم استخراجه بواسطة ليدززز في {new Date(selectedEvidence.timestamp).toLocaleDateString('ar-SA')}</p>
                              </div>
                          </div>
                          <button className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black text-sm">استخدام في عرض السعر</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LeadDetailPage;
