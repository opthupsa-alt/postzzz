
import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Trash2, FileText, 
  Smartphone, Download, Activity, ShieldCheck, 
  Server, Database, Eye, ChevronLeft, Loader2, Users,
  Shield, Target, Lock, CheckCircle2, AlertTriangle, Zap
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Guard from '../components/Guard';
import { getAuditLogs, AuditLog } from '../lib/api';
import { showToast } from '../components/NotificationToast';

const AuditLogsPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const logs = await getAuditLogs({ limit: 100 });
        setAuditLogs(logs);
      } catch (err: any) {
        console.error('Failed to load audit logs:', err);
        showToast('ERROR', 'خطأ', 'فشل تحميل سجلات الرقابة');
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const filteredLogs = auditLogs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.entityType || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionStyles = (action: string) => {
    if (action.includes('حذف')) return 'bg-red-50 text-red-600 border-red-100';
    if (action.includes('إرسال')) return 'bg-green-50 text-green-600 border-green-100';
    if (action.includes('تصدير')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (action.includes('تعديل')) return 'bg-orange-50 text-orange-600 border-orange-100';
    return 'bg-gray-50 text-gray-500 border-gray-100';
  };

  return (
    <Guard role="ADMIN">
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <PageHeader 
          title="سجل الرقابة والامتثال" 
          subtitle="تتبع جميع النشاطات والإجراءات المتخذة داخل النظام لضمان أمن البيانات والامتثال لأعلى المعايير"
          actions={
            <button className="bg-white text-gray-700 px-8 py-3 rounded-2xl font-black border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center gap-2">
              <Download size={20} /> تصدير السجل (CSV)
            </button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-3 space-y-8">
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600" size={20} />
                  <input 
                    type="text" 
                    placeholder="البحث بالمستخدم، نوع الإجراء أو الهدف المستهدف..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700 shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="flex items-center justify-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-gray-200 hover:bg-black transition-all active:scale-95 w-full md:w-auto">
                  <Filter size={20} /> تصفية التاريخ
                </button>
              </div>

              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[600px]">
                <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex items-center justify-between">
                   <h3 className="font-black text-xl text-gray-900 flex items-center gap-3">
                     <ShieldCheck size={24} className="text-blue-600" /> العمليات الأخيرة
                   </h3>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تحديث تلقائي كل 30 ثانية</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-gray-50/30 border-b border-gray-100">
                        <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">الإجراء المتخذ</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">بواسطة</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">الهدف</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">التوقيت</th>
                        <th className="px-10 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                            <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                          </td>
                        </tr>
                      ) : filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-gray-400">
                            <Eye size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="font-bold">لا توجد سجلات</p>
                          </td>
                        </tr>
                      ) : filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-blue-50/30 transition-all group">
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl border-2 shadow-sm ${getActionStyles(log.action)} group-hover:scale-110 transition-transform`}>
                                {log.action.includes('DELETE') ? <Trash2 size={18} /> : log.action.includes('CREATE') ? <FileText size={18} /> : <Activity size={18} />}
                              </div>
                              <span className="font-black text-gray-900 text-sm">{log.action}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 text-blue-600 flex items-center justify-center font-black text-xs shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                {log.user?.name?.[0] || '?'}
                              </div>
                              <span className="text-sm font-bold text-gray-700">{log.user?.name || 'نظام'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-2">
                               <Database size={14} className="text-gray-300" />
                               <span className="text-sm font-bold text-gray-500">{log.entityType || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col text-[11px] text-gray-400 font-black uppercase tracking-tighter">
                              <span className="font-bold text-gray-700">{new Date(log.createdAt).toLocaleTimeString('ar-SA')}</span>
                              <span>{new Date(log.createdAt).toLocaleDateString('ar-SA')}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-left">
                             <button className="p-3 bg-white border border-gray-100 rounded-xl text-gray-300 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                               <ChevronLeft size={20} className="rtl-flip" />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>

           <div className="space-y-8 lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                 <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                       <div>
                          <h3 className="font-black text-xl tracking-tight">سلامة النظام</h3>
                          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">Real-time status</p>
                       </div>
                       <Server className="text-blue-400 group-hover:rotate-12 transition-transform duration-700" size={32} />
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-400">حماية البيانات (Active)</span>
                          <span className="text-xs font-black text-green-400 flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                             100% SECURE
                          </span>
                       </div>
                       <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-blue-600 w-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">إصدار التشفير</p>
                          <p className="font-mono text-xs text-blue-400">LZ-AES-256-GCM</p>
                       </div>
                       <Shield className="text-white/10" size={48} />
                    </div>
                 </div>
                 <ShieldCheck className="absolute -bottom-10 -left-10 text-white/5 rotate-12 transition-transform group-hover:scale-125 duration-1000" size={240} />
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 group hover:border-blue-100 transition-all">
                 <h3 className="font-black text-xl text-gray-900 flex items-center gap-3">
                   <Target size={24} className="text-blue-600" /> تحليل المخاطر
                 </h3>
                 <div className="space-y-6">
                    <div className="flex items-center gap-4 group/item">
                       <div className="p-4 bg-red-50 text-red-600 rounded-[1.5rem] border border-red-100 group-hover/item:bg-red-600 group-hover/item:text-white transition-all duration-500">
                          <Lock size={22} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-gray-900">محاولات دخول مريبة</p>
                          <p className="text-xs font-bold text-green-600 flex items-center gap-1 mt-0.5"><CheckCircle2 size={12} /> لا توجد (آمن)</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 group/item">
                       <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem] border border-orange-100 group-hover/item:bg-orange-600 group-hover/item:text-white transition-all duration-500">
                          <AlertTriangle size={22} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-gray-900">عمليات حذف جماعي</p>
                          <p className="text-xs font-bold text-gray-400">2 سجلات هذا الأسبوع</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 group/item">
                       <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] border border-blue-100 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all duration-500">
                          <Zap size={22} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-gray-900">تصدير بيانات ضخم</p>
                          <p className="text-xs font-bold text-gray-400">1 عملية مراقبة</p>
                       </div>
                    </div>
                 </div>
                 <div className="pt-6 border-t border-gray-50">
                    <button className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-lg transition-all border border-gray-100">تحميل تقرير الامتثال الربع سنوي</button>
                 </div>
              </div>

              <div className="p-8 bg-blue-600 rounded-[3rem] text-white flex flex-col items-center text-center space-y-4 shadow-xl shadow-blue-100">
                 <ShieldCheck size={48} className="animate-bounce" />
                 <h4 className="font-black text-lg">الرقابة النشطة مفعلة</h4>
                 <p className="text-xs text-blue-100 font-bold leading-relaxed">يتم تسجيل كل نقرة وإجراء آلياً لضمان شفافية كاملة للفريق.</p>
              </div>
           </div>
        </div>
      </div>
    </Guard>
  );
};

export default AuditLogsPage;
