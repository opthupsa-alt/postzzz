import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RotateCcw, Loader2, Check, X,
  Map, Search, Share2, Sliders, Eye, EyeOff, Bug,
  Instagram, Twitter, Facebook, Linkedin, Music2, Ghost
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { apiRequest } from '../lib/api';

interface ExtensionSettings {
  enableGoogleMaps: boolean;
  enableGoogleSearch: boolean;
  enableSocialMedia: boolean;
  matchThreshold: number;
  maxResults: number;
  searchDelay: number;
  showSearchWindow: boolean;
  socialPlatforms: Record<string, boolean>;
  debugMode: boolean;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  enableGoogleMaps: true,
  enableGoogleSearch: true,
  enableSocialMedia: false,
  matchThreshold: 90,
  maxResults: 30,
  searchDelay: 3,
  showSearchWindow: false,
  socialPlatforms: {},
  debugMode: false,
};

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: '#000000' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: '#000000' },
  { id: 'snapchat', name: 'Snapchat', icon: Ghost, color: '#FFFC00' },
];

const ExtensionSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ settings: ExtensionSettings }>('/extension-settings');
      if (response?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...response.settings });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await apiRequest('/extension-settings', { method: 'PUT', body: JSON.stringify(settings) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات؟')) return;
    
    try {
      setSaving(true);
      await apiRequest('/extension-settings/reset', { method: 'POST' });
      setSettings(DEFAULT_SETTINGS);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof ExtensionSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleSocialPlatform = (platformId: string) => {
    setSettings(prev => ({
      ...prev,
      socialPlatforms: {
        ...prev.socialPlatforms,
        [platformId]: !prev.socialPlatforms[platformId],
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="إعدادات الإضافة" 
        subtitle="تحكم في سلوك إضافة Chrome وطبقات البحث"
        actions={
          <div className="flex gap-3">
            <button 
              onClick={resetSettings}
              disabled={saving}
              className="bg-white text-gray-700 px-6 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <RotateCcw size={18} /> إعادة تعيين
            </button>
            <button 
              onClick={saveSettings}
              disabled={saving}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : saved ? <Check size={18} /> : <Save size={18} />}
              {saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Search Layers */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Sliders size={20} className="text-blue-600" />
            </div>
            طبقات البحث
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
              <div className="flex items-center gap-3">
                <Map size={20} className="text-green-600" />
                <div>
                  <span className="font-bold text-gray-900">Google Maps</span>
                  <p className="text-xs text-gray-500">البحث الأساسي في خرائط جوجل</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.enableGoogleMaps}
                onChange={(e) => updateSetting('enableGoogleMaps', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
              <div className="flex items-center gap-3">
                <Search size={20} className="text-blue-600" />
                <div>
                  <span className="font-bold text-gray-900">Google Search</span>
                  <p className="text-xs text-gray-500">البحث عن الموقع الرسمي وحسابات التواصل</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.enableGoogleSearch}
                onChange={(e) => updateSetting('enableGoogleSearch', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
              <div className="flex items-center gap-3">
                <Share2 size={20} className="text-purple-600" />
                <div>
                  <span className="font-bold text-gray-900">Social Media</span>
                  <p className="text-xs text-gray-500">البحث في منصات التواصل المتصلة</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.enableSocialMedia}
                onChange={(e) => updateSetting('enableSocialMedia', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
          </div>
        </div>

        {/* Match Settings */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-xl">
              <Check size={20} className="text-green-600" />
            </div>
            إعدادات التطابق
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                حد التطابق الأدنى: {settings.matchThreshold}%
              </label>
              <input 
                type="range" 
                min="50" 
                max="100" 
                value={settings.matchThreshold}
                onChange={(e) => updateSetting('matchThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50% (مرن)</span>
                <span>100% (صارم)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الحد الأقصى للنتائج
              </label>
              <select 
                value={settings.maxResults}
                onChange={(e) => updateSetting('maxResults', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
              >
                <option value={10}>10 نتائج</option>
                <option value={20}>20 نتيجة</option>
                <option value={30}>30 نتيجة</option>
                <option value={50}>50 نتيجة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                تأخير البحث (ثواني)
              </label>
              <select 
                value={settings.searchDelay}
                onChange={(e) => updateSetting('searchDelay', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
              >
                <option value={2}>2 ثواني (سريع)</option>
                <option value={3}>3 ثواني (متوسط)</option>
                <option value={5}>5 ثواني (آمن)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Social Platforms */}
        {settings.enableSocialMedia && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-xl">
                <Share2 size={20} className="text-purple-600" />
              </div>
              منصات التواصل
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {SOCIAL_PLATFORMS.map(platform => {
                const Icon = platform.icon;
                const isEnabled = settings.socialPlatforms[platform.id];
                
                return (
                  <button
                    key={platform.id}
                    onClick={() => toggleSocialPlatform(platform.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                      isEnabled 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={20} style={{ color: isEnabled ? platform.color : '#9ca3af' }} />
                    <span className={`font-bold text-sm ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                      {platform.name}
                    </span>
                    {isEnabled && <Check size={16} className="text-blue-600 mr-auto" />}
                  </button>
                );
              })}
            </div>
            
            <p className="text-xs text-gray-400 mt-4">
              يجب تسجيل الدخول في المنصات من إعدادات الإضافة لتفعيل البحث فيها
            </p>
          </div>
        )}

        {/* Advanced Settings */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Settings size={20} className="text-orange-600" />
            </div>
            إعدادات متقدمة
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
              <div className="flex items-center gap-3">
                {settings.showSearchWindow ? <Eye size={20} className="text-blue-600" /> : <EyeOff size={20} className="text-gray-400" />}
                <div>
                  <span className="font-bold text-gray-900">إظهار نافذة البحث</span>
                  <p className="text-xs text-gray-500">عرض المتصفح أثناء البحث</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.showSearchWindow}
                onChange={(e) => updateSetting('showSearchWindow', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
              <div className="flex items-center gap-3">
                <Bug size={20} className={settings.debugMode ? 'text-red-600' : 'text-gray-400'} />
                <div>
                  <span className="font-bold text-gray-900">وضع التصحيح</span>
                  <p className="text-xs text-gray-500">عرض معلومات تفصيلية في Console</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.debugMode}
                onChange={(e) => updateSetting('debugMode', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <Settings size={24} className="text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">كيفية عمل البحث الذكي</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              يبحث النظام في طبقات متعددة للحصول على أدق النتائج. يبدأ بـ Google Maps للحصول على معلومات الاتصال الأساسية،
              ثم Google Search للموقع الرسمي وحسابات التواصل، وأخيراً البحث المباشر في منصات التواصل المتصلة.
              يتم قبول النتائج فقط إذا تجاوزت نسبة التطابق الحد الأدنى المحدد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensionSettingsPage;
