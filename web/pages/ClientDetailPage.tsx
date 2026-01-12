import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Edit, Trash2, Globe, Calendar, 
  Instagram, Facebook, Twitter, Linkedin, Plus, MoreHorizontal,
  Building2, Mail, Link, AlertCircle, Youtube, AtSign, Music2, Ghost
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { 
  getClient, deleteClient, createPlatform, deletePlatform,
  Client, ClientPlatform, SocialPlatform, PLATFORM_CONFIG, ALL_PLATFORMS, CreatePlatformDto
} from '../lib/clients-api';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  X: Twitter,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
  LINKEDIN: Linkedin,
  YOUTUBE: Youtube,
  THREADS: AtSign,
  TIKTOK: Music2,
  SNAPCHAT: Ghost,
};

const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'platforms' | 'posts' | 'team'>('platforms');
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [addingPlatform, setAddingPlatform] = useState(false);
  
  // Platform modal state
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [platformForm, setPlatformForm] = useState({ profileUrl: '', handle: '' });

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClient(clientId!);
      setClient(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل بيانات العميل');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    try {
      await deleteClient(clientId!);
      navigate('/app/clients');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حذف العميل');
    }
  };

  const openPlatformModal = (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    setPlatformForm({ profileUrl: '', handle: '' });
    setShowPlatformModal(true);
    setShowAddPlatform(false);
  };

  const handleAddPlatform = async () => {
    if (!selectedPlatform) return;
    
    // Validate profile URL
    if (!platformForm.profileUrl.trim()) {
      setError('رابط البروفايل مطلوب للتحقق من الحساب');
      return;
    }
    
    try {
      setAddingPlatform(true);
      const dto: CreatePlatformDto = { 
        platform: selectedPlatform,
        profileUrl: platformForm.profileUrl.trim(),
        handle: platformForm.handle.trim() || undefined,
      };
      await createPlatform(clientId!, dto);
      await loadClient();
      setShowPlatformModal(false);
      setSelectedPlatform(null);
      setPlatformForm({ profileUrl: '', handle: '' });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إضافة المنصة');
    } finally {
      setAddingPlatform(false);
    }
  };

  const getProfileUrlPlaceholder = (platform: SocialPlatform): string => {
    const placeholders: Record<SocialPlatform, string> = {
      X: 'https://x.com/username',
      INSTAGRAM: 'https://instagram.com/username',
      FACEBOOK: 'https://facebook.com/username',
      LINKEDIN: 'https://linkedin.com/in/username',
      TIKTOK: 'https://tiktok.com/@username',
      YOUTUBE: 'https://youtube.com/@handle',
      THREADS: 'https://threads.net/@username',
      SNAPCHAT: 'https://snapchat.com/add/username',
    };
    return placeholders[platform] || 'https://...';
  };

  const handleDeletePlatform = async (platformId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المنصة؟')) return;
    try {
      await deletePlatform(platformId);
      await loadClient();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حذف المنصة');
    }
  };

  const getAvailablePlatforms = (): SocialPlatform[] => {
    if (!client?.platforms) return ALL_PLATFORMS;
    const usedPlatforms = client.platforms.map(p => p.platform);
    return ALL_PLATFORMS.filter(p => !usedPlatforms.includes(p));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <EmptyState 
        icon={Building2}
        title="العميل غير موجود"
        description="لم يتم العثور على العميل المطلوب"
        action={
          <button 
            onClick={() => navigate('/app/clients')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            العودة للعملاء
          </button>
        }
      />
    );
  }

  const tabs = [
    { id: 'platforms', label: 'المنصات', count: client.platforms.length },
    { id: 'posts', label: 'المنشورات', count: 0 },
    { id: 'team', label: 'الفريق', count: 0 },
  ];

  return (
    <div>
      {/* Back Button */}
      <button 
        onClick={() => navigate('/app/clients')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 font-bold"
      >
        <ArrowRight size={20} />
        العودة للعملاء
      </button>

      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
              {client.logoUrl ? (
                <img src={client.logoUrl} alt={client.name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                client.name.charAt(0)
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">{client.name}</h1>
              {client.industry && (
                <p className="text-gray-500 font-medium mt-1">{client.industry}</p>
              )}
              <div className="flex items-center gap-4 mt-3">
                {client.contactEmail && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Mail size={14} />
                    {client.contactEmail}
                  </span>
                )}
                {client.website && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Link size={14} />
                    {client.website}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/app/clients/${clientId}/edit`)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Edit size={18} />
              تعديل
            </button>
            <button 
              onClick={handleDeleteClient}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              حذف
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-blue-500' : 'bg-gray-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'platforms' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900">المنصات المرتبطة</h2>
            <button 
              onClick={() => setShowAddPlatform(!showAddPlatform)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              إضافة منصة
            </button>
          </div>

          {/* Add Platform Dropdown */}
          {showAddPlatform && (
            <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
              <p className="text-sm font-bold text-gray-700 mb-3">اختر منصة:</p>
              <div className="flex flex-wrap gap-2">
                {getAvailablePlatforms().map(platform => {
                  const config = PLATFORM_CONFIG[platform];
                  const Icon = PLATFORM_ICONS[platform] || Globe;
                  return (
                    <button
                      key={platform}
                      onClick={() => openPlatformModal(platform)}
                      disabled={addingPlatform}
                      className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      <Icon size={18} />
                      <span className="font-bold text-sm">{config.name}</span>
                    </button>
                  );
                })}
                {getAvailablePlatforms().length === 0 && (
                  <p className="text-gray-500 text-sm">تم إضافة جميع المنصات المتاحة</p>
                )}
              </div>
            </div>
          )}

          {(!client.platforms || client.platforms.length === 0) ? (
            <EmptyState 
              icon={Globe}
              title="لا توجد منصات"
              description="أضف منصات التواصل الاجتماعي لهذا العميل"
              action={
                <button 
                  onClick={() => setShowAddPlatform(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  إضافة منصة
                </button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {client.platforms.map(platform => {
                const Icon = PLATFORM_ICONS[platform.platform] || Globe;
                const config = PLATFORM_CONFIG[platform.platform];
                return (
                  <div 
                    key={platform.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center shadow-sm`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {config?.name || platform.platform}
                        </p>
                        {platform.handle && (
                          <p className="text-sm text-gray-500">@{platform.handle}</p>
                        )}
                        {platform.profileUrl && (
                          <a 
                            href={platform.profileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <Link size={12} />
                            رابط البروفايل
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        platform.isEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {platform.isEnabled ? 'مفعّل' : 'معطّل'}
                      </span>
                      <button 
                        onClick={() => handleDeletePlatform(platform.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <EmptyState 
            icon={Calendar}
            title="لا توجد منشورات"
            description="أنشئ منشورات جديدة لهذا العميل"
            action={
              <button 
                onClick={() => navigate('/app/posts/new')}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                إنشاء منشور
              </button>
            }
          />
        </div>
      )}

      {activeTab === 'team' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <EmptyState 
            icon={Building2}
            title="إدارة الفريق"
            description="قريباً - تعيين أعضاء الفريق لهذا العميل"
          />
        </div>
      )}
      
      {/* Platform Add Modal */}
      <PlatformModal
        isOpen={showPlatformModal}
        platform={selectedPlatform}
        form={platformForm}
        onFormChange={setPlatformForm}
        onSubmit={handleAddPlatform}
        onClose={() => {
          setShowPlatformModal(false);
          setSelectedPlatform(null);
        }}
        loading={addingPlatform}
        getPlaceholder={getProfileUrlPlaceholder}
      />
    </div>
  );
};

// Platform Add Modal
const PlatformModal: React.FC<{
  isOpen: boolean;
  platform: SocialPlatform | null;
  form: { profileUrl: string; handle: string };
  onFormChange: (form: { profileUrl: string; handle: string }) => void;
  onSubmit: () => void;
  onClose: () => void;
  loading: boolean;
  getPlaceholder: (platform: SocialPlatform) => string;
}> = ({ isOpen, platform, form, onFormChange, onSubmit, onClose, loading, getPlaceholder }) => {
  if (!isOpen || !platform) return null;
  
  const config = PLATFORM_CONFIG[platform];
  const Icon = PLATFORM_ICONS[platform] || Globe;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center shadow-sm`}>
            <Icon size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">إضافة {config?.name}</h3>
            <p className="text-sm text-gray-500">أدخل معلومات الحساب</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              رابط البروفايل <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={form.profileUrl}
              onChange={(e) => onFormChange({ ...form, profileUrl: e.target.value })}
              placeholder={getPlaceholder(platform)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left dir-ltr"
              dir="ltr"
            />
            <p className="text-xs text-gray-400 mt-1">مطلوب للتحقق من أن الحساب المتصل هو الصحيح</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              اسم المستخدم (Handle)
            </label>
            <input
              type="text"
              value={form.handle}
              onChange={(e) => onFormChange({ ...form, handle: e.target.value })}
              placeholder="username"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left dir-ltr"
              dir="ltr"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || !form.profileUrl.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Plus size={18} />
                إضافة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailPage;
