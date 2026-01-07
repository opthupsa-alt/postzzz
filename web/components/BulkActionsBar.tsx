
import React from 'react';
import { X, ListPlus, Check, MessageSquare, Download, Trash2 } from 'lucide-react';

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
  onSaveToList: () => void;
  onBulkWhatsApp?: () => void;
  onBulkDelete?: () => void;
  onBulkApprove?: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ 
  count, onClear, onSaveToList, onBulkWhatsApp, onBulkDelete, onBulkApprove 
}) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-8 py-5 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex items-center gap-10 animate-in slide-in-from-bottom-10 duration-300">
      <div className="flex items-center gap-4 pr-6 border-l border-white/10">
        <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20">
          {count}
        </div>
        <span className="font-bold text-lg whitespace-nowrap">عملاء مختارين</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onSaveToList}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl transition-all text-sm font-black active:scale-95"
        >
          <ListPlus size={20} /> حفظ في قائمة
        </button>
        
        {onBulkWhatsApp && (
          <button 
            onClick={onBulkWhatsApp}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl transition-all text-sm font-black shadow-lg shadow-green-900/20 active:scale-95"
          >
            <MessageSquare size={20} /> واتساب جماعي
          </button>
        )}

        {onBulkApprove && (
          <button 
            onClick={onBulkApprove}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl transition-all text-sm font-black active:scale-95"
          >
            <Check size={20} /> تأهيل مجمع
          </button>
        )}

        {onBulkDelete && (
          <button 
            onClick={onBulkDelete}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 px-6 py-3 rounded-2xl transition-all text-sm font-black active:scale-95"
          >
            <Trash2 size={20} /> حذف نهائي
          </button>
        )}
      </div>

      <button 
        onClick={onClear} 
        className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
        title="إلغاء التحديد"
      >
        <X size={24} />
      </button>
    </div>
  );
};

export default BulkActionsBar;
