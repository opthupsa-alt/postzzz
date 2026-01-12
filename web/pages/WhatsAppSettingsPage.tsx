import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, QrCode, Smartphone, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface WhatsAppStatus {
  status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected' | 'failed';
  qrCode: string | null;
  phoneNumber: string | null;
  error: string | null;
}

export default function WhatsAppSettingsPage() {
  const [status, setStatus] = useState<WhatsAppStatus>({
    status: 'disconnected',
    qrCode: null,
    phoneNumber: null,
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [polling, setPolling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiRequest('/whatsapp/web/status');
      setStatus(response);
      return response;
    } catch (error) {
      console.error('Failed to fetch WhatsApp status:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStatus().finally(() => setLoading(false));
  }, [fetchStatus]);

  useEffect(() => {
    if (status.status === 'qr_ready' || status.status === 'connecting') {
      setPolling(true);
      const interval = setInterval(async () => {
        const newStatus = await fetchStatus();
        if (newStatus?.status === 'connected' || newStatus?.status === 'failed' || newStatus?.status === 'disconnected') {
          setPolling(false);
          clearInterval(interval);
        }
      }, 3000);

      return () => {
        clearInterval(interval);
        setPolling(false);
      };
    }
  }, [status.status, fetchStatus]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await apiRequest('/whatsapp/web/initialize', { method: 'POST' });
      setTimeout(fetchStatus, 2000);
    } catch (error: any) {
      console.error('Failed to initialize WhatsApp:', error);
      setStatus(prev => ({
        ...prev,
        status: 'failed',
        error: error.message || 'فشل في تهيئة الاتصال',
      }));
    } finally {
      setInitializing(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await apiRequest('/whatsapp/web/disconnect', { method: 'POST' });
      setStatus({
        status: 'disconnected',
        qrCode: null,
        phoneNumber: null,
        error: null,
      });
    } catch (error: any) {
      console.error('Failed to disconnect WhatsApp:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium";
    switch (status.status) {
      case 'connected':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}><CheckCircle2 className="w-3 h-3 ml-1" /> متصل</span>;
      case 'connecting':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}><Loader2 className="w-3 h-3 ml-1 animate-spin" /> جاري الاتصال</span>;
      case 'qr_ready':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}><QrCode className="w-3 h-3 ml-1" /> في انتظار المسح</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}><XCircle className="w-3 h-3 ml-1" /> فشل</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}><AlertTriangle className="w-3 h-3 ml-1" /> غير متصل</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات الواتساب</h1>
          <p className="text-gray-500">ربط حساب الواتساب لإرسال الإشعارات</p>
        </div>
        <button 
          onClick={() => fetchStatus()} 
          disabled={polling}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${polling ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Smartphone className="w-5 h-5 text-blue-600" />
              حالة الاتصال
            </h2>
            <p className="text-sm text-gray-500 mt-1">حالة اتصال الواتساب الحالية</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">الحالة:</span>
              {getStatusBadge()}
            </div>

            {status.phoneNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">رقم الهاتف:</span>
                <span className="font-mono text-gray-900">{status.phoneNumber}</span>
              </div>
            )}

            {status.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {status.error}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {status.status === 'connected' ? (
                <button 
                  onClick={handleDisconnect} 
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  قطع الاتصال
                </button>
              ) : (status.status === 'disconnected' || status.status === 'failed') ? (
                <button 
                  onClick={handleInitialize} 
                  disabled={initializing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {initializing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري التهيئة...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      ربط الواتساب
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <QrCode className="w-5 h-5 text-blue-600" />
              رمز QR
            </h2>
            <p className="text-sm text-gray-500 mt-1">امسح هذا الرمز من تطبيق الواتساب على هاتفك</p>
          </div>
          <div className="p-6">
            {status.status === 'qr_ready' && status.qrCode ? (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <img 
                    src={status.qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>افتح تطبيق الواتساب على هاتفك</li>
                    <li>اذهب إلى الإعدادات &gt; الأجهزة المرتبطة</li>
                    <li>اضغط على "ربط جهاز"</li>
                    <li>وجّه الكاميرا نحو هذا الرمز</li>
                  </ol>
                </div>
                {polling && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    في انتظار المسح...
                  </div>
                )}
              </div>
            ) : status.status === 'connecting' ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <p className="text-gray-500">جاري الاتصال بالواتساب...</p>
              </div>
            ) : status.status === 'connected' ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
                <p className="text-lg font-medium text-green-600">تم الاتصال بنجاح!</p>
                <p className="text-sm text-gray-500">سيتم إرسال الإشعارات عبر الواتساب تلقائياً</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <QrCode className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500">اضغط على "ربط الواتساب" لبدء عملية الربط</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h2 className="text-lg font-bold text-gray-900">كيف يعمل؟</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border border-gray-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">1</div>
                <h3 className="font-medium text-gray-900">ربط الحساب</h3>
              </div>
              <p className="text-sm text-gray-500">امسح رمز QR من تطبيق الواتساب لربط حسابك</p>
            </div>
            <div className="p-4 border border-gray-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">2</div>
                <h3 className="font-medium text-gray-900">إشعارات تلقائية</h3>
              </div>
              <p className="text-sm text-gray-500">ستصلك إشعارات عند نجاح أو فشل عمليات النشر</p>
            </div>
            <div className="p-4 border border-gray-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">3</div>
                <h3 className="font-medium text-gray-900">آمن ومشفر</h3>
              </div>
              <p className="text-sm text-gray-500">الاتصال مشفر من طرف إلى طرف كما في الواتساب العادي</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
