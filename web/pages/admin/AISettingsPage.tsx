import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Zap,
  Brain,
  DollarSign,
  Clock,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface AISettings {
  provider: string;
  modelName: string;
  apiKey: string | null;
  apiEndpoint: string | null;
  maxTokens: number;
  temperature: number;
  enableWebSearch: boolean;
  systemPrompt: string;
  userPromptTemplate: string;
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
  estimatedCostPerRequest: number;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'OPENAI',
  modelName: 'gpt-4-turbo',
  apiKey: null,
  apiEndpoint: null,
  maxTokens: 8000,
  temperature: 0.7,
  enableWebSearch: true,
  systemPrompt: '',
  userPromptTemplate: '',
  maxRequestsPerMinute: 10,
  maxRequestsPerDay: 1000,
  estimatedCostPerRequest: 0.5,
};

const PROVIDERS = [
  { id: 'OPENAI', name: 'OpenAI', models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
  { id: 'GEMINI', name: 'Google Gemini', models: ['gemini-pro', 'gemini-ultra'], disabled: true },
  { id: 'ANTHROPIC', name: 'Anthropic Claude', models: ['claude-3-opus', 'claude-3-sonnet'], disabled: true },
];

const AISettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [activePromptTab, setActivePromptTab] = useState<'system' | 'user'>('system');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ settings: AISettings; isConfigured: boolean }>('/admin/ai-settings');
      setSettings(response.settings);
      setIsConfigured(response.isConfigured);
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await apiRequest('/admin/ai-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setIsConfigured(!!settings.apiKey && !settings.apiKey.startsWith('****'));
    } catch (error) {
      console.error('Failed to save AI settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const result = await apiRequest<{ success: boolean; message: string }>('/admin/ai-settings/test', {
        method: 'POST',
      });
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'فشل الاختبار' });
    } finally {
      setTesting(false);
    }
  };

  const loadDefaultPrompts = async () => {
    try {
      const response = await apiRequest<{ systemPrompt: string; userPromptTemplate: string }>('/admin/ai-settings/default-prompts');
      setSettings((prev) => ({
        ...prev,
        systemPrompt: response.systemPrompt,
        userPromptTemplate: response.userPromptTemplate,
      }));
    } catch (error) {
      console.error('Failed to load default prompts:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const selectedProvider = PROVIDERS.find((p) => p.id === settings.provider);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Brain className="text-purple-600" />
            إعدادات الذكاء الاصطناعي
          </h1>
          <p className="text-gray-500 mt-2">إدارة إعدادات AI EBI لتحليل العملاء</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={testConnection}
            disabled={testing || !isConfigured}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            اختبار الاتصال
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ الإعدادات
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {testResult.success ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span className="font-bold">{testResult.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Provider Settings */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Settings size={20} className="text-purple-600" />
            مزود الخدمة
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">المزود</label>
              <select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id} disabled={provider.disabled}>
                    {provider.name} {provider.disabled ? '(قريباً)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">النموذج</label>
              <select
                value={settings.modelName}
                onChange={(e) => setSettings({ ...settings, modelName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {selectedProvider?.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">مفتاح API</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey || ''}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                نقطة النهاية (اختياري)
              </label>
              <input
                type="text"
                value={settings.apiEndpoint || ''}
                onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Model Parameters */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Zap size={20} className="text-purple-600" />
            إعدادات النموذج
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الحد الأقصى للـ Tokens: {settings.maxTokens.toLocaleString()}
              </label>
              <input
                type="range"
                min="1000"
                max="16000"
                step="500"
                value={settings.maxTokens}
                onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                درجة الحرارة (Temperature): {settings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>دقيق</span>
                <span>إبداعي</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-bold text-gray-700">البحث في الإنترنت</p>
                <p className="text-sm text-gray-500">السماح للنموذج بالبحث في الويب</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableWebSearch}
                  onChange={(e) => setSettings({ ...settings, enableWebSearch: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Clock size={20} className="text-purple-600" />
            حدود الاستخدام
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">طلبات/دقيقة</label>
              <input
                type="number"
                value={settings.maxRequestsPerMinute}
                onChange={(e) => setSettings({ ...settings, maxRequestsPerMinute: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">طلبات/يوم</label>
              <input
                type="number"
                value={settings.maxRequestsPerDay}
                onChange={(e) => setSettings({ ...settings, maxRequestsPerDay: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                التكلفة التقديرية/طلب (SAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.estimatedCostPerRequest}
                onChange={(e) => setSettings({ ...settings, estimatedCostPerRequest: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <DollarSign size={20} className="text-purple-600" />
            الحالة
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="font-bold text-gray-700">حالة الاتصال</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {isConfigured ? '🟢 متصل' : '🟡 غير مكتمل'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="font-bold text-gray-700">المزود الحالي</span>
              <span className="text-gray-600">{selectedProvider?.name || '-'}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="font-bold text-gray-700">النموذج</span>
              <span className="text-gray-600">{settings.modelName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prompts */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-purple-600" />
            الـ Prompts
          </h2>
          <button
            onClick={loadDefaultPrompts}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={16} />
            استعادة الافتراضي
          </button>
        </div>

        <div className="flex gap-2 border-b border-gray-100">
          <button
            onClick={() => setActivePromptTab('system')}
            className={`px-4 py-2 font-bold transition-colors ${
              activePromptTab === 'system'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            System Prompt
          </button>
          <button
            onClick={() => setActivePromptTab('user')}
            className={`px-4 py-2 font-bold transition-colors ${
              activePromptTab === 'user'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            User Prompt Template
          </button>
        </div>

        {activePromptTab === 'system' && (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              التعليمات الأساسية للنموذج (تُرسل مع كل طلب)
            </p>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
              rows={15}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              dir="rtl"
            />
          </div>
        )}

        {activePromptTab === 'user' && (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              قالب الطلب (يتم استبدال المتغيرات مثل {'{{BUSINESS_NAME}}'} ببيانات العميل)
            </p>
            <textarea
              value={settings.userPromptTemplate}
              onChange={(e) => setSettings({ ...settings, userPromptTemplate: e.target.value })}
              rows={15}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              dir="rtl"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AISettingsPage;
