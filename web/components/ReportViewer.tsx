
import React from 'react';
import { Report, ReportSection } from '../types';
import { CheckCircle2, AlertCircle, ExternalLink, Copy, FileText, ShieldAlert, Target, FileSearch } from 'lucide-react';

interface ReportViewerProps {
  report?: Report;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report }) => {
  // Fix: Handle undefined report to prevent crash
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
        <div className="bg-gray-50 p-10 rounded-[3rem] mb-6 relative group">
          <FileText size={64} className="text-gray-200 group-hover:text-blue-400 transition-colors" />
          <div className="absolute top-0 right-0 bg-blue-600 w-4 h-4 rounded-full animate-ping"></div>
        </div>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">لا يوجد تقرير ذكي حالياً</h3>
        <p className="text-gray-500 max-w-sm mx-auto mt-4 font-bold leading-relaxed">
          يتطلب هذا العميل تشغيل "الفحص الآلي" أولاً لتحليل نشاطه الرقمي وبناء تقرير مبيعات مخصص.
        </p>
      </div>
    );
  }

  const getConfidenceInfo = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return { label: 'موثق بدقة عالية', color: 'text-green-600 bg-green-50 border-green-100', icon: ShieldAlert };
      case 'MEDIUM': return { label: 'موثق', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: ShieldAlert };
      case 'LOW': return { label: 'غير مؤكد (Unconfirmed)', color: 'text-red-600 bg-red-50 border-red-100', icon: AlertCircle };
      default: return { label: 'قيد التحليل', color: 'text-gray-600 bg-gray-50 border-gray-100', icon: AlertCircle };
    }
  };

  const handleCopy = () => {
    const text = `${report.summary}\n\n` + report.sections.map(s => `${s.title}:\n${s.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    alert('تم نسخ محتوى التقرير بنجاح');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
            <FileText size={28} />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-2xl tracking-tight">تقرير المبيعات الذكي (AI Analysis)</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
              <Target size={12} className="text-blue-500" /> تم التحديث: {new Date(report.lastUpdated).toLocaleDateString('ar-SA')}
            </p>
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 text-sm font-black text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-2xl transition-all border border-blue-50 group active:scale-95"
        >
          <Copy size={18} className="group-hover:rotate-12 transition-transform" />
          نسخ التقرير بالكامل
        </button>
      </div>

      <div className="bg-gray-50/50 p-10 rounded-[2.5rem] border border-gray-100 text-gray-800 leading-relaxed relative group hover:bg-white hover:shadow-xl transition-all">
        <div className="absolute top-0 right-10 transform -translate-y-1/2 bg-white px-4 py-1 rounded-full border border-gray-100 text-[10px] font-black text-blue-600 uppercase tracking-widest shadow-sm">ملخص تنفيذي مخصص</div>
        <p className="text-xl font-bold italic leading-loose text-gray-700">"{report.summary}"</p>
      </div>

      <div className="grid gap-8">
        {report.sections.map((section, idx) => {
          const conf = getConfidenceInfo(section.confidence);
          const Icon = conf.icon;
          return (
            <div key={idx} className={`bg-white border rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all group ${section.confidence === 'LOW' ? 'border-red-100' : 'border-gray-100'}`}>
              <div className={`p-6 border-b flex items-center justify-between ${section.confidence === 'LOW' ? 'bg-red-50/30 border-red-50' : 'bg-gray-50/30 border-gray-50'}`}>
                <h4 className="font-black text-gray-900 text-lg">{section.title}</h4>
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tighter ${conf.color}`}>
                  <Icon size={14} />
                  {conf.label}
                </div>
              </div>
              <div className="p-8 text-lg text-gray-600 leading-loose font-medium">
                {section.content}
              </div>
              {section.evidenceIds.length > 0 ? (
                <div className="bg-gray-50/50 p-5 px-8 flex flex-wrap items-center gap-4 border-t border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الأدلة المرجعية ({section.evidenceIds.length}):</span>
                  <div className="flex gap-2">
                    {section.evidenceIds.map(id => (
                      <span key={id} className="text-[11px] bg-white border border-gray-200 px-3 py-1 rounded-lg text-blue-600 font-mono font-black shadow-sm group-hover:border-blue-300 transition-colors">
                        # {id.slice(-5)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : section.confidence === 'LOW' && (
                <div className="bg-red-50/50 p-4 px-8 flex items-center gap-3 border-t border-red-50 italic">
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-xs font-bold text-red-700">تحذير: لا توجد أدلة كافية لدعم هذا الادعاء. تم وضعه كاحتمال بناءً على توجه السوق.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-10 flex flex-col items-center gap-4 border-t border-gray-50">
        <p className="text-xs font-bold text-gray-400">جميع الادعاءات في هذا التقرير مستمدة من بيانات رقمية عامة وموثقة برقم مرجعي للأدلة.</p>
        <div className="flex gap-4">
          <button className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl active:scale-95">تحويل التقرير إلى PDF</button>
          <button className="bg-white border border-gray-200 text-gray-700 px-8 py-3 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all">مشاركة مع الفريق</button>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
