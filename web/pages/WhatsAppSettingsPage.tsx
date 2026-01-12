import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, QrCode, Smartphone, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

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
      const response = await api.get('/whatsapp/web/status');
      setStatus(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch WhatsApp status:', error);
      return null;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchStatus().finally(() => setLoading(false));
  }, [fetchStatus]);

  // Poll for status updates when QR is ready or connecting
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
      await api.post('/whatsapp/web/initialize');
      // Start polling for QR code
      setTimeout(fetchStatus, 2000);
    } catch (error: any) {
      console.error('Failed to initialize WhatsApp:', error);
      setStatus(prev => ({
        ...prev,
        status: 'failed',
        error: error.response?.data?.message || 'فشل في تهيئة الاتصال',
      }));
    } finally {
      setInitializing(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/web/disconnect');
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
    switch (status.status) {
      case 'connected':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 ml-1" /> متصل</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500"><Loader2 className="w-3 h-3 ml-1 animate-spin" /> جاري الاتصال</Badge>;
      case 'qr_ready':
        return <Badge className="bg-blue-500"><QrCode className="w-3 h-3 ml-1" /> في انتظار المسح</Badge>;
      case 'failed':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 ml-1" /> فشل</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 ml-1" /> غير متصل</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إعدادات الواتساب</h1>
          <p className="text-muted-foreground">ربط حساب الواتساب لإرسال الإشعارات</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={polling}>
          <RefreshCw className={`w-4 h-4 ml-2 ${polling ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              حالة الاتصال
            </CardTitle>
            <CardDescription>
              حالة اتصال الواتساب الحالية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الحالة:</span>
              {getStatusBadge()}
            </div>

            {status.phoneNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">رقم الهاتف:</span>
                <span className="font-mono">{status.phoneNumber}</span>
              </div>
            )}

            {status.error && (
              <Alert variant="destructive">
                <AlertDescription>{status.error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              {status.status === 'connected' ? (
                <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                  قطع الاتصال
                </Button>
              ) : status.status === 'disconnected' || status.status === 'failed' ? (
                <Button onClick={handleInitialize} disabled={initializing}>
                  {initializing ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري التهيئة...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 ml-2" />
                      ربط الواتساب
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              رمز QR
            </CardTitle>
            <CardDescription>
              امسح هذا الرمز من تطبيق الواتساب على هاتفك
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.status === 'qr_ready' && status.qrCode ? (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={status.qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64"
                  />
                </div>
                <Alert>
                  <AlertDescription>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>افتح تطبيق الواتساب على هاتفك</li>
                      <li>اذهب إلى الإعدادات &gt; الأجهزة المرتبطة</li>
                      <li>اضغط على "ربط جهاز"</li>
                      <li>وجّه الكاميرا نحو هذا الرمز</li>
                    </ol>
                  </AlertDescription>
                </Alert>
                {polling && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    في انتظار المسح...
                  </div>
                )}
              </div>
            ) : status.status === 'connecting' ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground">جاري الاتصال بالواتساب...</p>
              </div>
            ) : status.status === 'connected' ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
                <p className="text-lg font-medium text-green-600">تم الاتصال بنجاح!</p>
                <p className="text-sm text-muted-foreground">
                  سيتم إرسال الإشعارات عبر الواتساب تلقائياً
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <QrCode className="w-16 h-16 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  اضغط على "ربط الواتساب" لبدء عملية الربط
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>كيف يعمل؟</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">1</div>
                <h3 className="font-medium">ربط الحساب</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                امسح رمز QR من تطبيق الواتساب لربط حسابك
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">2</div>
                <h3 className="font-medium">إشعارات تلقائية</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                ستصلك إشعارات عند نجاح أو فشل عمليات النشر
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">3</div>
                <h3 className="font-medium">آمن ومشفر</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                الاتصال مشفر من طرف إلى طرف كما في الواتساب العادي
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
