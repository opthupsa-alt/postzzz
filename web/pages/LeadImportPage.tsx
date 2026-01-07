
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, ArrowLeft, Zap, Database } from 'lucide-react';
import { useStore } from '../store/useStore';
import PageHeader from '../components/PageHeader';
import { JobStatus } from '../types';

const LeadImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { addJob, updateJob, bulkSaveLeads } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = () => {
    if (!file) return;

    setIsImporting(true);
    const jobId = Math.random().toString(36).substr(2, 9);
    
    addJob({
      id: jobId,
      type: 'SEARCH', // Using search as proxy for import job
      status: JobStatus.RUNNING,
      progress: 0,
      message: `جاري تحليل ملف الاستيراد: ${file.name}`,
      createdAt: new Date().toISOString()
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);
        
        // Mock import data
        const importedLeads = [
          { id: 'IMP-1', companyName: 'شركة الرمال الذهبية', industry: 'سياحة', city: 'نيوم', status: 'NEW' as const, evidenceCount: 0, hasReport: false },
          { id: 'IMP-2', companyName: 'مطبعة الخط العربي', industry: 'خدمات', city: 'مكة', status: 'NEW' as const, evidenceCount: 0, hasReport: false },
        ];
        
        bulkSaveLeads(importedLeads);
        updateJob(jobId, { status: JobStatus.SUCCESS, progress: 100, message: `اكتمل الاستيراد: تم إضافة ${importedLeads.length} عميل` });
        setIsImporting(false);
        setTimeout(() => navigate('/app/leads'), 1000);
      } else {
        updateJob(jobId, { progress, message: 'جاري استخراج البيانات وفلترة التكرار...' });
      }
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <PageHeader 
        title="استيراد عملاء (Bulk Import)" 
        subtitle="ارفع ملف CSV أو Excel لإضافة مجموعة كبيرة من العملاء دفعة واحدة"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div 
            className={`bg-white border-4 border-dashed rounded-[3rem] p-16 flex flex-col items-center justify-center text-center space-y-6 transition-all cursor-pointer ${
              file ? 'border-blue-600 bg-blue-50/30' : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,.xlsx,.xls';
              input.onchange = (e: any) => setFile(e.target.files[0]);
              input.click();
            }}
          >
            <div className={`p-8 rounded-[2.5rem] shadow-xl ${file ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-200'}`}>
              <Upload size={64} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900">{file ? file.name : 'اسحب ملفك هنا'}</h3>
              <p className="text-gray-500 font-bold mt-2">يدعم ملفات CSV, XLSX, XLS بحد أقصى 10MB</p>
            </div>
          </div>

          {file && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between animate-in zoom-in duration-300">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><CheckCircle2 size={32} /></div>
                 <div>
                   <p className="text-lg font-black text-gray-900">الملف جاهز للاستيراد</p>
                   <p className="text-sm font-bold text-gray-400">حجم الملف: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                 </div>
               </div>
               <button 
                 onClick={handleImport}
                 disabled={isImporting}
                 className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
               >
                 {isImporting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Database size={20} />}
                 بدء الاستيراد
               </button>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
             <h3 className="font-black text-xl text-gray-900 flex items-center gap-2"><FileSpreadsheet size={20} className="text-blue-600" /> نموذج الملف</h3>
             <p className="text-sm text-gray-500 font-bold leading-relaxed">لضمان دقة البيانات، يرجى استخدام النموذج المعتمد لدينا وترتيب الأعمدة بشكل صحيح.</p>
             <button className="w-full bg-gray-50 text-blue-600 py-4 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all border border-blue-100 flex items-center justify-center gap-2">
               <Download size={18} /> تحميل النموذج الفارغ
             </button>
          </div>

          <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100 space-y-4">
             <div className="flex items-center gap-2 text-orange-600"><AlertCircle size={24} /><h4 className="font-black">ملاحظات هامة</h4></div>
             <ul className="space-y-3">
               <li className="text-xs font-bold text-orange-800 leading-relaxed">• اسم الشركة حقل إلزامي لا يمكن تركه فارغاً.</li>
               <li className="text-xs font-bold text-orange-800 leading-relaxed">• سيتم فحص الأرقام المكررة وتجاهلها تلقائياً.</li>
               <li className="text-xs font-bold text-orange-800 leading-relaxed">• يفضل وضع كود الدولة قبل أرقام الواتساب.</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadImportPage;
