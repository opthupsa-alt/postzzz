
import React, { useState } from 'react';
import { ListTodo, Plus, Folder, MoreVertical, Search, MessageSquare, Download, X, Trash2, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lists, addList, deleteList, savedLeads } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    addList({
      id: Math.random().toString(36).substr(2, 9),
      name: newListName,
      count: 0,
      updatedAt: 'الآن'
    });
    setNewListName('');
    setShowCreateModal(false);
  };

  const getListLeadsCount = (listId: string) => {
    return savedLeads.filter(l => l.listId === listId).length;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">القوائم (Lists)</h1>
          <p className="text-gray-500 mt-2 font-medium">نظم عملائك في مجموعات لتسهيل المتابعة</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 ring-offset-2 hover:ring-2 hover:ring-blue-500/50"
        >
          <Plus size={24} />
          <span>إنشاء قائمة جديدة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {lists.map((list) => (
          <div 
            key={list.id} 
            onClick={() => navigate(`/app/lists/${list.id}`)}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer group p-8 relative overflow-hidden"
          >
             <div className="flex items-start justify-between mb-6">
               <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:scale-110">
                 <Folder size={32} />
               </div>
               <div className="relative">
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     setShowOptionsId(showOptionsId === list.id ? null : list.id);
                   }}
                   className="text-gray-300 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-xl transition-all"
                 >
                   <MoreVertical size={24} />
                 </button>
                 {showOptionsId === list.id && (
                   <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         deleteList(list.id);
                         setShowOptionsId(null);
                       }}
                       className="w-full text-right px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                     >
                       <Trash2 size={16} /> حذف القائمة
                     </button>
                   </div>
                 )}
               </div>
             </div>
             
             <h3 className="font-black text-2xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{list.name}</h3>
             <p className="text-sm font-bold text-gray-400 mb-8">{getListLeadsCount(list.id)} عميل • تم التحديث {list.updatedAt}</p>
             
             <div className="flex gap-3">
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    // In a real app, this would open a bulk WhatsApp modal for this list
                 }}
                 className="flex-1 bg-gray-50 text-gray-700 py-3.5 rounded-2xl text-xs font-black hover:bg-green-50 hover:text-green-600 flex items-center justify-center gap-2 transition-all border border-transparent hover:border-green-100"
               >
                 <MessageSquare size={16} /> واتساب للكل
               </button>
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    // In a real app, this would trigger a download
                 }}
                 className="flex-1 bg-gray-50 text-gray-700 py-3.5 rounded-2xl text-xs font-black hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center gap-2 transition-all border border-transparent hover:border-blue-100"
               >
                 <Download size={16} /> تصدير
               </button>
             </div>

             <div className="absolute -bottom-4 -left-4 p-8 opacity-0 group-hover:opacity-5 transition-opacity duration-700">
               <Folder size={120} className="rotate-12" />
             </div>
          </div>
        ))}
        
        <div 
          onClick={() => setShowCreateModal(true)}
          className="bg-gray-50/50 border-4 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-gray-300 hover:border-blue-400 hover:text-blue-400 hover:bg-blue-50 transition-all cursor-pointer group h-full min-h-[300px]"
        >
           <div className="bg-white p-6 rounded-full shadow-sm mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
             <Plus size={54} />
           </div>
           <span className="font-black text-xl">إضافة قائمة جديدة</span>
        </div>
      </div>

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Plus size={24} />
                </div>
                <h3 className="font-black text-2xl text-gray-900">إنشاء قائمة</h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateList}>
              <div className="p-10 space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">اسم القائمة</label>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="مثلاً: عقارات الرياض - الملقا"
                    className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] px-6 py-4 text-lg font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                </div>
                <div className="bg-blue-50/50 p-6 rounded-[1.5rem] border border-blue-100/50 text-sm font-bold text-blue-800 leading-relaxed flex gap-4">
                  <div className="bg-white p-2 h-fit rounded-lg shadow-sm"><Search size={16} /></div>
                  <p>تساعدك القوائم على تنظيم العملاء حسب المنطقة، النشاط، أو مرحلة المبيعات لتسهيل عمليات الإرسال الجماعي.</p>
                </div>
              </div>
              <div className="p-10 bg-gray-50 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-gray-500 hover:bg-white transition-all border border-transparent hover:border-gray-200"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  disabled={!newListName.trim()}
                  className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  حفظ القائمة <ArrowLeft size={20} className="rtl-flip" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListsPage;
