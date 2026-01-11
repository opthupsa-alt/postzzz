import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Building2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';

interface ClientFormData {
  name: string;
  industry: string;
  logoUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
}

const ClientFormPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(clientId);
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    industry: '',
    logoUrl: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    // TODO: Replace with actual API call
    // const data = await getClient(clientId);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // TODO: Replace with actual API call
      // if (isEdit) {
      //   await updateClient(clientId, formData);
      // } else {
      //   await createClient(formData);
      // }
      navigate('/app/clients');
    } catch (error) {
      console.error('Failed to save client:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={() => navigate('/app/clients')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 font-bold"
      >
        <ArrowRight size={20} />
        العودة للعملاء
      </button>

      <PageHeader 
        title={isEdit ? 'تعديل العميل' : 'إضافة عميل جديد'}
        subtitle={isEdit ? 'تحديث بيانات العميل' : 'أدخل بيانات العميل الجديد'}
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              اسم العميل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="مثال: شركة أرامكو"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              القطاع/الصناعة
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              placeholder="مثال: النفط والغاز"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              الموقع الإلكتروني
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              اسم جهة الاتصال
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              placeholder="مثال: أحمد محمد"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              placeholder="contact@example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              placeholder="+966 5X XXX XXXX"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              رابط الشعار
            </label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/app/clients')}
            className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving || !formData.name}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ التغييرات' : 'إضافة العميل')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientFormPage;
