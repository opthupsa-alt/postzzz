import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Edit, Trash2, Globe, Calendar, Send, 
  Instagram, Facebook, Twitter, Linkedin, Plus, MoreHorizontal,
  Building2, Mail, Phone, Link, CheckCircle, XCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

interface ClientPlatform {
  id: string;
  platform: string;
  accountName: string;
  accountUrl?: string;
  isConnected: boolean;
}

interface Client {
  id: string;
  name: string;
  industry?: string;
  logoUrl?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  platforms: ClientPlatform[];
  createdAt: string;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
  TWITTER: Twitter,
  LINKEDIN: Linkedin,
};

const PLATFORM_NAMES: Record<string, string> = {
  INSTAGRAM: 'انستقرام',
  FACEBOOK: 'فيسبوك',
  TWITTER: 'تويتر/إكس',
  LINKEDIN: 'لينكدإن',
  TIKTOK: 'تيك توك',
  SNAPCHAT: 'سناب شات',
};

const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'platforms' | 'posts' | 'team'>('platforms');

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    // TODO: Replace with actual API call
    // const data = await getClient(clientId);
    setClient(null);
    setLoading(false);
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
            <button className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center gap-2">
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

      {/* Tab Content */}
      {activeTab === 'platforms' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900">المنصات المرتبطة</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus size={18} />
              إضافة منصة
            </button>
          </div>

          {client.platforms.length === 0 ? (
            <EmptyState 
              icon={Globe}
              title="لا توجد منصات"
              description="أضف منصات التواصل الاجتماعي لهذا العميل"
              action={
                <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <Plus size={20} />
                  إضافة منصة
                </button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {client.platforms.map(platform => {
                const Icon = PLATFORM_ICONS[platform.platform] || Globe;
                return (
                  <div 
                    key={platform.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Icon size={24} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {PLATFORM_NAMES[platform.platform] || platform.platform}
                        </p>
                        <p className="text-sm text-gray-500">@{platform.accountName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`flex items-center gap-1 text-sm font-bold ${
                        platform.isConnected ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {platform.isConnected ? (
                          <>
                            <CheckCircle size={16} />
                            متصل
                          </>
                        ) : (
                          <>
                            <XCircle size={16} />
                            غير متصل
                          </>
                        )}
                      </span>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors">
                        <MoreHorizontal size={18} className="text-gray-400" />
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
    </div>
  );
};

export default ClientDetailPage;
