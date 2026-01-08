import { useState, useEffect } from 'react';
import { Settings, Globe, Search, Zap, Shield, Save, RefreshCw } from 'lucide-react';

interface PlatformSettings {
  id: string;
  platformUrl: string;
  apiUrl: string;
  searchMethod: 'GOOGLE_MAPS_REAL' | 'GOOGLE_MAPS_API';
  googleApiKey: string | null;
  maxSearchResults: number;
  defaultCountry: string;
  extensionAutoLogin: boolean;
  extensionDebugMode: boolean;
  requireSubscription: boolean;
  trialDays: number;
  searchRateLimit: number;
  crawlRateLimit: number;
  updatedAt: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('leedz_token');
      const response = await fetch(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('leedz_token');
      const response = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platformUrl: settings.platformUrl,
          apiUrl: settings.apiUrl,
          searchMethod: settings.searchMethod,
          googleApiKey: settings.googleApiKey,
          maxSearchResults: settings.maxSearchResults,
          defaultCountry: settings.defaultCountry,
          extensionAutoLogin: settings.extensionAutoLogin,
          extensionDebugMode: settings.extensionDebugMode,
          requireSubscription: settings.requireSubscription,
          trialDays: settings.trialDays,
          searchRateLimit: settings.searchRateLimit,
          crawlRateLimit: settings.crawlRateLimit,
        }),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      const data = await response.json();
      setSettings(data);
      setSuccess('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#64748b' }}>جاري التحميل...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#dc2626' }}>{error || 'فشل تحميل الإعدادات'}</div>
        <button
          onClick={fetchSettings}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Settings size={28} color="#3b82f6" />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>إعدادات المنصة</h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={fetchSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={18} />
            تحديث
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: saving ? '#94a3b8' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            <Save size={18} />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 16, borderRadius: 12, marginBottom: 24 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a', padding: 16, borderRadius: 12, marginBottom: 24 }}>
          {success}
        </div>
      )}

      {/* Settings Sections */}
      <div style={{ display: 'grid', gap: 24 }}>
        {/* URLs Section */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Globe size={24} color="#3b82f6" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>روابط المنصة</h2>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                رابط واجهة المستخدم (Web App)
              </label>
              <input
                type="url"
                value={settings.platformUrl}
                onChange={(e) => setSettings({ ...settings, platformUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  direction: 'ltr',
                }}
                placeholder="http://localhost:5173"
              />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                رابط الموقع الرئيسي للمنصة (يستخدمه الـ Extension للربط التلقائي)
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                رابط API
              </label>
              <input
                type="url"
                value={settings.apiUrl}
                onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  direction: 'ltr',
                }}
                placeholder="http://localhost:3001"
              />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                رابط الـ Backend API
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Search size={24} color="#3b82f6" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>إعدادات البحث</h2>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                طريقة البحث في Google Maps
              </label>
              <select
                value={settings.searchMethod}
                onChange={(e) => setSettings({ ...settings, searchMethod: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'white',
                }}
              >
                <option value="GOOGLE_MAPS_REAL">بحث حقيقي (بدون API)</option>
                <option value="GOOGLE_MAPS_API">Google Places API</option>
              </select>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                البحث الحقيقي يستخدم المتصفح مباشرة، بينما API يحتاج مفتاح Google
              </p>
            </div>
            {settings.searchMethod === 'GOOGLE_MAPS_API' && (
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  Google API Key
                </label>
                <input
                  type="password"
                  value={settings.googleApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, googleApiKey: e.target.value || null })}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 14,
                    direction: 'ltr',
                  }}
                  placeholder="AIza..."
                />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  عدد نتائج البحث المتعدد
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.maxSearchResults}
                  onChange={(e) => setSettings({ ...settings, maxSearchResults: parseInt(e.target.value) || 30 })}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  الحد الأقصى لنتائج البحث المتعدد (Bulk Search)
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  الدولة الافتراضية
                </label>
                <select
                  value={settings.defaultCountry}
                  onChange={(e) => setSettings({ ...settings, defaultCountry: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 14,
                    background: 'white',
                  }}
                >
                  <option value="SA">السعودية</option>
                  <option value="AE">الإمارات</option>
                  <option value="EG">مصر</option>
                  <option value="KW">الكويت</option>
                  <option value="QA">قطر</option>
                  <option value="BH">البحرين</option>
                  <option value="OM">عمان</option>
                  <option value="JO">الأردن</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  حد البحث (في الدقيقة)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.searchRateLimit}
                  onChange={(e) => setSettings({ ...settings, searchRateLimit: parseInt(e.target.value) || 10 })}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  حد الفحص (في الدقيقة)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.crawlRateLimit}
                  onChange={(e) => setSettings({ ...settings, crawlRateLimit: parseInt(e.target.value) || 20 })}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Extension Section */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Zap size={24} color="#3b82f6" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>إعدادات الإضافة</h2>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.extensionAutoLogin}
                onChange={(e) => setSettings({ ...settings, extensionAutoLogin: e.target.checked })}
                style={{ width: 20, height: 20, accentColor: '#3b82f6' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>تسجيل الدخول التلقائي</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  السماح للإضافة بتسجيل الدخول تلقائياً من المنصة
                </div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.extensionDebugMode}
                onChange={(e) => setSettings({ ...settings, extensionDebugMode: e.target.checked })}
                style={{ width: 20, height: 20, accentColor: '#3b82f6' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>وضع التصحيح</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  عرض معلومات تصحيح إضافية في الإضافة (للمطورين)
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Subscription Section */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Shield size={24} color="#3b82f6" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>إعدادات الاشتراك</h2>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.requireSubscription}
                onChange={(e) => setSettings({ ...settings, requireSubscription: e.target.checked })}
                style={{ width: 20, height: 20, accentColor: '#3b82f6' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>تفعيل نظام الاشتراك</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  إذا معطل، جميع المستخدمين يعتبرون مشتركين تلقائياً
                </div>
              </div>
            </label>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                فترة التجربة (أيام)
              </label>
              <input
                type="number"
                min={0}
                max={365}
                value={settings.trialDays}
                onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value) || 14 })}
                style={{
                  width: 200,
                  padding: 12,
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                عدد أيام التجربة المجانية للمستخدمين الجدد
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div style={{ marginTop: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
        آخر تحديث: {new Date(settings.updatedAt).toLocaleString('ar-SA')}
      </div>
    </div>
  );
}
