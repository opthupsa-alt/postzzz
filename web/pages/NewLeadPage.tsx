
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Globe, Phone, Mail, Plus, X, ArrowLeft, Save, Briefcase } from 'lucide-react';
import { useStore } from '../store/useStore';
import PageHeader from '../components/PageHeader';

const NewLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveLead } = useStore();
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    city: 'الرياض',
    website: '',
    phone: '',
    email: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead = {
      id: `manual-${Math.random().toString(36).substr(2, 9)}`,
      ...formData,
      status: 'NEW' as const,
      evidenceCount: 0,
      hasReport: false,
    };
    saveLead(newLead);
    navigate(`/app/leads/${newLead.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <PageHeader 
        title="إضافة عميل يدوي" 
        subtitle="أدخل بيانات العميل مباشرة في قاعدة بياناتك الخاصة"
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">اسم الشركة *</label>
              <div className="relative">
                <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  required
                  placeholder="مثلاً: شركة آفاق التقنية"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">قطاع النشاط</label>
              <div className="relative">
                <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="مثلاً: برمجيات، أغذية..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">المدينة</label>
              <div className="relative">
                <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">الموقع الإلكتروني</label>
              <div className="relative">
                <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="url" 
                  placeholder="https://..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-left"
                  dir="ltr"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">رقم الجوال</label>
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="+966 5X XXX XXXX"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-left"
                  dir="ltr"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="email" 
                  placeholder="info@company.com"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-12 pl-4 font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-left"
                  dir="ltr"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className="flex-1 py-5 bg-white text-gray-500 font-black rounded-3xl border border-gray-100 hover:bg-gray-50 transition-all"
          >
            إلغاء التغييرات
          </button>
          <button 
            type="submit"
            className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Save size={24} /> حفظ العميل الآن
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewLeadPage;
