
import React from 'react';
import { Filter, Check, X, Phone, Globe, MapPin, Briefcase } from 'lucide-react';

interface SmartFiltersProps {
  onFilterChange: (filters: any) => void;
  activeFilters: any;
}

const SmartFilters: React.FC<SmartFiltersProps> = ({ onFilterChange, activeFilters }) => {
  const toggleFilter = (key: string, value: any) => {
    const newFilters = { ...activeFilters };
    if (newFilters[key] === value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFilterChange(newFilters);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm">
        <Filter size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">تصفية ذكية</span>
      </div>

      <button 
        onClick={() => toggleFilter('hasPhone', true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
          activeFilters.hasPhone ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-blue-200'
        }`}
      >
        <Phone size={14} /> يوجد رقم
      </button>

      <button 
        onClick={() => toggleFilter('hasWebsite', true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
          activeFilters.hasWebsite ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-blue-200'
        }`}
      >
        <Globe size={14} /> يوجد موقع
      </button>

      <div className="h-6 w-px bg-gray-200 mx-2"></div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">الحالة:</span>
        {['QUALIFIED', 'CONTACTED', 'NEW'].map(status => (
          <button 
            key={status}
            onClick={() => toggleFilter('status', status)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              activeFilters.status === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {status === 'QUALIFIED' ? 'مؤهل' : status === 'CONTACTED' ? 'متواصل' : 'جديد'}
          </button>
        ))}
      </div>

      {Object.keys(activeFilters).length > 0 && (
        <button 
          onClick={() => onFilterChange({})}
          className="flex items-center gap-1 text-[10px] font-black text-red-500 hover:text-red-600 transition-colors mr-auto"
        >
          <X size={14} /> مسح الفلاتر
        </button>
      )}
    </div>
  );
};

export default SmartFilters;
