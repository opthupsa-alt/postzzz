
import React, { useState, useMemo } from 'react';
import { Users, Search, Download, MessageSquare, Plus, CheckCircle2, Clock, Trash2, Building2, ShieldAlert, Upload, UserPlus, FileText, Layers, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SmartFilters from '../components/SmartFilters';
import BulkActionsBar from '../components/BulkActionsBar';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/SkeletonBlocks';
import WhatsAppModal from '../components/WhatsAppModal';
import DataTable from '../components/DataTable';
import { JobStatus, Lead } from '../types';
import { showToast } from '../components/NotificationToast';

const LeadsManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { savedLeads, removeLead, addJob, updateJob } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [isLoading] = useState(false);

  const filteredLeads = useMemo(() => {
    return savedLeads.filter(l => {
      const matchesSearch = l.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           l.industry.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeFilters.status && l.status !== activeFilters.status) return false;
      if (activeFilters.hasPhone && !l.phone) return false;
      return matchesSearch;
    });
  }, [savedLeads, searchTerm, activeFilters]);

  const handleBulkExport = () => {
    if (selectedIds.length === 0) return;
    
    const jobId = Math.random().toString(36).substr(2, 9);
    addJob({
      id: jobId,
      type: 'SEARCH',
      status: JobStatus.RUNNING,
      progress: 0,
      message: `جاري تحضير ملف التصدير لـ ${selectedIds.length} عميل...`,
      createdAt: new Date().toISOString()
    });

    showToast('JOB', 'بدء التصدير', 'يتم الآن تجميع بيانات العملاء المختارين...');

    setTimeout(() => {
      updateJob(jobId, { progress: 100, status: JobStatus.SUCCESS, message: 'جاهز للتحميل: تم استخراج البيانات بنجاح' });
      showToast('SUCCESS', 'اكتمل التصدير', 'تم تجهيز ملف الـ Excel للتحميل.');
      setSelectedIds([]);
    }, 2500);
  };

  const handleBulkReveal = () => {
    const jobId = Math.random().toString(36).substr(2, 9);
    addJob({
      id: jobId,
      type: 'SURVEY',
      status: JobStatus.RUNNING,
      progress: 0,
      message: 'جاري فحص البيانات العميقة (Reveal)...',
      createdAt: new Date().toISOString()
    });

    setTimeout(() => {
      updateJob(jobId, { progress: 100, status: JobStatus.SUCCESS, message: 'اكتمل الكشف: تم تحديث بيانات التواصل' });
      setSelectedIds([]);
    }, 3000);
  };

  const columns = [
    {
      header: 'العميل',
      accessor: (l: Lead) => (
        <div className="flex items-center gap-4 group">
          <div className="h-12 w-12 bg-white border border-gray-100 text-blue-600 rounded-2xl flex items-center justify-center font-black shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
            {l.companyName[0]}
          </div>
          <div>
            <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{l.companyName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-400 font-bold">{l.industry}</span>
              <span className="text-gray-200">•</span>
              <span className="text-[10px] text-gray-400 font-bold">{l.city}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'التحليل الرقمي',
      className: 'text-center',
      accessor: (l: Lead) => (
        <div className="flex items-center justify-center gap-6">
           <div className="flex flex-col items-center group/icon">
             <div className="p-2 bg-gray-50 rounded-xl group-hover/icon:bg-blue-50 transition-colors">
               <Layers size={16} className="text-gray-400 group-hover/icon:text-blue-600" />
             </div>
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{l.evidenceCount} أدلة</span>
           </div>
           <div className="flex flex-col items-center group/icon">
             <div className={`p-2 rounded-xl transition-colors ${l.hasReport ? 'bg-green-50' : 'bg-gray-50'}`}>
               <FileText size={16} className={l.hasReport ? 'text-green-600' : 'text-gray-400'} />
             </div>
             <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${l.hasReport ? 'text-green-600' : 'text-gray-400'}`}>
               {l.hasReport ? 'جاهز' : 'مطلوب'}
             </span>
           </div>
        </div>
      )
    },
    {
      header: 'الحالة',
      accessor: (l: Lead) => (
        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${
          l.status === 'QUALIFIED' ? 'bg-green-50 text-green-600 border-green-100 shadow-sm shadow-green-50' : 
          l.status === 'CONTACTED' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm shadow-blue-50' : 
          'bg-gray-50 text-gray-500 border-gray-100'
        }`}>
          {l.status === 'QUALIFIED' ? 'مؤهل للبيع' : l.status === 'CONTACTED' ? 'تم التواصل' : 'جديد'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="إدارة العملاء (CRM)" 
        subtitle="متابعة رحلة البيع وإدارة قاعدة بيانات عملائك المحفوظة"
        actions={
          <>
            <button onClick={() => navigate('/app/leads/import')} className="bg-white text-gray-700 px-6 py-2.5 rounded-2xl font-black border border-gray-200 shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
              <Upload size={18} /> استيراد CSV
            </button>
            <button onClick={() => navigate('/app/leads/new')} className="bg-blue-600 text-white px-8 py-2.5 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
              <UserPlus size={20} /> إضافة عميل
            </button>
          </>
        }
      />

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="البحث بالاسم، النشاط أو الموقع..." 
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-black text-gray-700 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <SmartFilters onFilterChange={setActiveFilters} activeFilters={activeFilters} />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : filteredLeads.length > 0 ? (
        <DataTable 
          data={filteredLeads}
          columns={columns}
          onRowClick={(l) => navigate(`/app/leads/${l.id}`)}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          actions={(l) => (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); navigate(`/app/companies/${l.id}`); }} 
                className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="عرض الشركة"
              >
                <Building2 size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowWhatsApp(true); }} 
                className="p-3 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                title="تواصل واتساب"
              >
                <MessageSquare size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); removeLead(l.id); showToast('INFO', 'تم الحذف', 'تم نقل العميل لسلة المهملات.'); }} 
                className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        />
      ) : (
        <EmptyState 
          icon={Users} 
          title="لا يوجد عملاء مطابقين" 
          description="جرب تغيير كلمات البحث أو الفلاتر، أو ابدأ بالبحث عن عملاء جدد في قسم الـ Prospecting."
          action={
            <button onClick={() => navigate('/app/prospecting')} className="bg-blue-600 text-white px-10 py-4 rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
              <Plus size={20} /> بدء بحث جديد الآن
            </button>
          }
        />
      )}

      <BulkActionsBar 
        count={selectedIds.length} 
        onClear={() => setSelectedIds([])} 
        onSaveToList={() => {}} 
        onBulkWhatsApp={() => setShowWhatsApp(true)}
        onBulkDelete={() => {
          if (confirm(`هل أنت متأكد من حذف ${selectedIds.length} عميل؟`)) {
            selectedIds.forEach(id => removeLead(id));
            setSelectedIds([]);
            showToast('INFO', 'حذف جماعي', 'تم حذف العملاء بنجاح.');
          }
        }}
        onBulkApprove={handleBulkReveal}
      />

      <WhatsAppModal 
        isOpen={showWhatsApp} 
        onClose={() => setShowWhatsApp(false)} 
        leadName={selectedIds.length > 1 ? `${selectedIds.length} عملاء مختارين` : filteredLeads.find(l => l.id === selectedIds[0])?.companyName || ''}
      />
    </div>
  );
};

export default LeadsManagementPage;
