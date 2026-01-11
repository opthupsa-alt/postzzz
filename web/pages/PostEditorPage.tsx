import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Save, Send, Calendar, Image, Video, 
  Instagram, Facebook, Twitter, Linkedin, Plus, X, Clock
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

const PLATFORMS = [
  { id: 'INSTAGRAM', name: 'انستقرام', icon: Instagram, color: 'from-pink-500 to-purple-500' },
  { id: 'FACEBOOK', name: 'فيسبوك', icon: Facebook, color: 'from-blue-600 to-blue-700' },
  { id: 'TWITTER', name: 'تويتر/إكس', icon: Twitter, color: 'from-gray-800 to-black' },
  { id: 'LINKEDIN', name: 'لينكدإن', icon: Linkedin, color: 'from-blue-700 to-blue-800' },
];

const PostEditorPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(postId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [postId]);

  const loadData = async () => {
    // TODO: Load clients and post data if editing
    setClients([]);
    setLoading(false);
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    // TODO: Save as draft
    setTimeout(() => {
      setSaving(false);
      navigate('/app/posts');
    }, 500);
  };

  const handleSchedule = async () => {
    setSaving(true);
    // TODO: Schedule post
    setTimeout(() => {
      setSaving(false);
      navigate('/app/posts');
    }, 500);
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
        onClick={() => navigate('/app/posts')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 font-bold"
      >
        <ArrowRight size={20} />
        العودة للتقويم
      </button>

      <PageHeader 
        title={isEdit ? 'تعديل المنشور' : 'منشور جديد'}
        subtitle={isEdit ? 'تحديث محتوى المنشور' : 'إنشاء منشور جديد للنشر'}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">اختر العميل</h3>
            {clients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">لا يوجد عملاء. أضف عميل أولاً.</p>
                <button 
                  onClick={() => navigate('/app/clients/new')}
                  className="text-blue-600 font-bold hover:underline"
                >
                  إضافة عميل
                </button>
              </div>
            ) : (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="">اختر العميل...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Platform Selection */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">المنصات</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PLATFORMS.map(platform => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <span className={`text-sm font-bold ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                      {platform.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">المحتوى</h3>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب محتوى المنشور هنا..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Image size={20} className="text-gray-400" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video size={20} className="text-gray-400" />
                </button>
              </div>
              <span className="text-sm text-gray-400">
                {content.length} حرف
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Schedule */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">الجدولة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Clock size={16} className="inline ml-1" />
                  موعد النشر
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 space-y-3">
            <button
              onClick={handleSchedule}
              disabled={saving || !content || selectedPlatforms.length === 0}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
              {scheduledAt ? 'جدولة المنشور' : 'نشر الآن'}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={20} />
              حفظ كمسودة
            </button>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">معاينة</h3>
            <div className="bg-gray-50 rounded-2xl p-4 min-h-[200px]">
              {content ? (
                <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
              ) : (
                <p className="text-gray-400 text-center">اكتب محتوى لمعاينته</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostEditorPage;
