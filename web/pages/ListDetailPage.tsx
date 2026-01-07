
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Folder, 
  Search, 
  Plus, 
  ArrowRight, 
  MessageSquare, 
  Download, 
  Trash2, 
  MoreVertical,
  MapPin,
  CheckCircle2,
  Clock,
  UserPlus
} from 'lucide-react';
import { useStore } from '../store/useStore';

const ListDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lists, savedLeads, removeLeadsFromList } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const list = lists.find(l => l.id === id);
  
  const leadsInList = useMemo(() => {
    return savedLeads.filter(l => l.listId === id && (
      l.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.industry.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [savedLeads, id, searchTerm]);

  if (!list) return <div className="p-20 text-center font-bold text-gray-400">القائمة غير موجودة</div>;

  const handleRemoveFromList = (leadId: string) => {
    removeLeadsFromList([leadId]);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/app/lists')} 
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 group"
          >
            <ArrowRight size={24} className="group-active:scale-90 transition-transform rtl-flip" />
          </button>
          <div className="h-16 w-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-100">
            <Folder size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{list.name}</h1>
            <p className="text-gray-500 font-bold mt-1">{leadsInList.length} عميل في هذه القائمة</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="bg-green-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-95">
            <MessageSquare size={20} /> إرسال جماعي
          </button>
          <button className="bg-white text-gray-700 px-6 py-3 rounded-2xl font-bold border border-gray-200 shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
            <Download size={20} /> تصدير
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="البحث داخل القائمة..." 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => navigate('/app/prospecting')}
            className="bg-blue-50 text-blue-600 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-100 transition-all border border-blue-100"
          >
            <UserPlus size={20} /> إضافة المزيد من البحث
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        {leadsInList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">العميل</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">النشاط والموقع</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">الحالة</th>
                  <th className="px-10 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leadsInList.map((lead) => (
                  <tr key={lead.id} className="hover:bg-blue-50/30 transition-all group cursor-pointer" onClick={() => navigate(`/app/leads/${lead.id}`)}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-white border border-gray-100 text-blue-600 rounded-2xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                          {lead.companyName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{lead.companyName}</p>
                          <p className="text-xs text-gray-400 font-bold">{lead.industry}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-1 text-sm font-bold text-gray-600">
                        <MapPin size={14} className="text-gray-400" /> {lead.city}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                        lead.status === 'QUALIFIED' ? 'bg-green-50 text-green-600 border-green-100' : 
                        lead.status === 'CONTACTED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                      }`}>
                        {lead.status === 'QUALIFIED' ? 'مؤهل' : lead.status === 'CONTACTED' ? 'تم التواصل' : 'جديد'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-left">
                       <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveFromList(lead.id); }}
                            className="p-3 text-red-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-gray-100"
                            title="إزالة من القائمة"
                          >
                           <Trash2 size={20} />
                         </button>
                         <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-gray-100"><MoreVertical size={20} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center">
            <div className="bg-gray-50 p-10 rounded-[3rem] mb-6">
               <Plus size={64} className="text-gray-200" />
            </div>
            <h3 className="text-2xl font-black text-gray-900">القائمة فارغة</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2 font-medium">ابدأ بإضافة عملاء من قاعدة البيانات أو من القائمة العامة.</p>
            <button 
              onClick={() => navigate('/app/prospecting')}
              className="mt-8 bg-blue-600 text-white px-10 py-4 rounded-[1.5rem] font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Search size={20} /> إضافة عملاء الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListDetailPage;
