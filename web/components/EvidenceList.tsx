
import React from 'react';
import { Evidence } from '../types';
import { ExternalLink, Globe, Hash, Newspaper, MessageSquare, Star, ArrowLeft, FileSearch, ShieldCheck } from 'lucide-react';

interface EvidenceListProps {
  evidence: Evidence[];
  onRunSurvey?: () => void;
  isLoading?: boolean;
  onViewDetail?: (ev: Evidence) => void;
}

const EvidenceList: React.FC<EvidenceListProps> = ({ evidence, onRunSurvey, isLoading, onViewDetail }) => {
  const getIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'WEBSITE': return <Globe size={22} />;
      case 'SOCIAL': return <Hash size={22} />;
      case 'NEWS': return <Newspaper size={22} />;
      case 'REVIEWS': return <Star size={22} />;
      default: return <Globe size={22} />;
    }
  };

  if (evidence.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in zoom-in duration-500">
            <div className="bg-gray-50 p-10 rounded-[3rem] mb-8 relative group">
                <FileSearch size={64} className="text-gray-200 group-hover:text-blue-400 transition-colors" />
                <div className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full animate-pulse border-4 border-white shadow-sm"></div>
            </div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">مستودع الأدلة فارغ</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-4 font-bold text-lg leading-relaxed">يتطلب "ليدززز" تشغيل المسح الآلي (Survey) للبحث عن الروابط والتصريحات الرقمية التي تخص هذا العميل.</p>
            <button 
                onClick={onRunSurvey}
                disabled={isLoading}
                className="mt-12 bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FileSearch size={24} />}
                <span>{isLoading ? 'جاري التحليل والبحث...' : 'بدء المسح واستخراج الأدلة'}</span>
            </button>
        </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">الأدلة الرقمية الموثقة ({evidence.length})</h3>
            <p className="text-sm text-gray-400 font-bold mt-1">تم التحقق من هذه المصادر بدقة عالية (Verified Sources)</p>
        </div>
        <div className="bg-green-50 text-green-600 px-4 py-2 rounded-2xl border border-green-100 flex items-center gap-2">
            <ShieldCheck size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Enterprise Evidence Engine</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {evidence.map((item) => (
            <div 
                key={item.id} 
                onClick={() => onViewDetail?.(item)}
                className="group bg-white border border-gray-100 rounded-[2.5rem] p-8 hover:border-blue-200 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
            >
                <div className="flex items-start justify-between gap-6 relative z-10">
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                {getIcon(item.type)}
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{item.title}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-black text-blue-400 bg-blue-50 px-2.5 py-0.5 rounded-lg uppercase tracking-widest">{item.source}</span>
                                    <span className="text-gray-200 font-bold">•</span>
                                    <span className="text-[10px] text-gray-400 font-bold">تم التحقق: {new Date(item.timestamp).toLocaleTimeString('ar-SA')}</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-lg text-gray-600 leading-loose italic border-r-4 border-gray-100 pr-6 group-hover:border-blue-200 transition-all font-medium">
                            "{item.snippet}"
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <a 
                            href={item.url} 
                            target="_blank" 
                            onClick={(e) => e.stopPropagation()}
                            className="p-4 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100 shadow-sm"
                            title="زيارة المصدر"
                        >
                            <ExternalLink size={24} />
                        </a>
                        <button className="p-4 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all border border-transparent hover:border-gray-200 shadow-sm">
                            <ArrowLeft size={24} className="rtl-flip" />
                        </button>
                    </div>
                </div>
                <div className="absolute -bottom-4 -left-4 p-8 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700">
                    {getIcon(item.type)}
                </div>
            </div>
        ))}
      </div>
      
      <div className="pt-10 flex justify-center">
          <button onClick={onRunSurvey} className="text-gray-400 font-black text-sm hover:text-blue-600 flex items-center gap-2 transition-colors">
              <FileSearch size={16} /> تحديث الأدلة أو استخراج المزيد
          </button>
      </div>
    </div>
  );
};

export default EvidenceList;
