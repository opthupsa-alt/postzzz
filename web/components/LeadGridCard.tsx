
import React from 'react';
import { Building2, MapPin, Globe, Phone, ChevronLeft, Target, ShieldCheck } from 'lucide-react';
import { Lead } from '../types';

interface LeadGridCardProps {
  lead: Lead;
  onClick: () => void;
  onSelect: (e: React.MouseEvent) => void;
  selected: boolean;
}

const LeadGridCard: React.FC<LeadGridCardProps> = ({ lead, onClick, onSelect, selected }) => {
  return (
    <div 
      onClick={onClick}
      className={`group bg-white rounded-[2rem] border-2 p-6 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full ${
        selected ? 'border-blue-600 shadow-xl shadow-blue-100' : 'border-gray-50 hover:border-blue-200 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
          {lead.companyName[0]}
        </div>
        <div onClick={onSelect} className="p-1">
           <input 
             type="checkbox" 
             checked={selected}
             readOnly
             className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
           />
        </div>
      </div>

      <div className="space-y-1 mb-6 flex-1">
        <h3 className="font-black text-lg text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">{lead.companyName}</h3>
        <p className="text-xs font-bold text-gray-400">{lead.industry}</p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <MapPin size={14} className="text-blue-500" />
          {lead.city}
        </div>
        <div className="flex items-center gap-2">
          {lead.phone && (
            <div className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-100">
              <Phone size={14} />
            </div>
          )}
          {lead.website && (
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Globe size={14} />
            </div>
          )}
          {lead.hasReport && (
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-100">
              <Target size={14} />
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${
          lead.status === 'QUALIFIED' ? 'bg-green-50 text-green-600 border-green-100' : 
          lead.status === 'NEW' ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-600'
        }`}>
          {lead.status === 'QUALIFIED' ? 'مؤهل' : lead.status === 'NEW' ? 'جديد' : 'متواصل'}
        </span>
        <ChevronLeft size={18} className="text-gray-300 group-hover:text-blue-600 transition-all transform group-hover:-translate-x-1" />
      </div>

      <Building2 className="absolute -bottom-10 -left-10 text-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700" size={120} />
    </div>
  );
};

export default LeadGridCard;
