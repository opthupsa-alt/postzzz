
import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronLeft, 
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Layout,
  X,
  Phone,
  ArrowLeft,
  Wand2,
  Sparkles,
  ExternalLink,
  Zap,
  QrCode,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Send
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Activity, WhatsAppTemplate } from '../types';
import { showToast } from '../components/NotificationToast';
import { 
  getWhatsAppWebStatus, 
  initializeWhatsAppWeb, 
  disconnectWhatsAppWeb,
  sendWhatsAppWebMessage,
  WhatsAppWebStatus 
} from '../lib/api';

const WhatsAppMessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { activities, leads, templates, addTemplate, updateTemplate, deleteTemplate, connectedPhone, setConnectedPhone } = useStore();
  const [activeTab, setActiveTab] = useState<'LOG' | 'TEMPLATES' | 'CONNECTION'>('LOG');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });
  
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [tempPhone, setTempPhone] = useState(connectedPhone);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // WhatsApp Web (QR Code) state
  const [webStatus, setWebStatus] = useState<WhatsAppWebStatus>({
    status: 'disconnected',
    qrCode: null,
    phoneNumber: null,
    error: null,
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Fetch WhatsApp Web status on mount and periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await getWhatsAppWebStatus();
        setWebStatus(status);
      } catch (err) {
        console.error('Failed to fetch WhatsApp Web status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleInitializeWeb = async () => {
    setIsInitializing(true);
    try {
      const result = await initializeWhatsAppWeb();
      if (result.success) {
        showToast('INFO', 'جاري الربط', 'يرجى مسح رمز QR من تطبيق واتساب');
        // Start polling more frequently
        const pollInterval = setInterval(async () => {
          const status = await getWhatsAppWebStatus();
          setWebStatus(status);
          if (status.status === 'connected' || status.status === 'failed') {
            clearInterval(pollInterval);
            setIsInitializing(false);
            if (status.status === 'connected') {
              showToast('SUCCESS', 'تم الربط', 'تم ربط واتساب بنجاح!');
            }
          }
        }, 2000);
        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsInitializing(false);
        }, 120000);
      } else {
        showToast('ERROR', 'خطأ', result.message);
        setIsInitializing(false);
      }
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل في بدء الربط');
      setIsInitializing(false);
    }
  };

  const handleDisconnectWeb = async () => {
    if (!confirm('هل أنت متأكد من قطع اتصال واتساب؟')) return;
    try {
      await disconnectWhatsAppWeb();
      setWebStatus({ status: 'disconnected', qrCode: null, phoneNumber: null, error: null });
      showToast('SUCCESS', 'تم القطع', 'تم قطع اتصال واتساب');
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل في قطع الاتصال');
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      showToast('ERROR', 'خطأ', 'يرجى إدخال رقم الهاتف والرسالة');
      return;
    }
    setIsSendingTest(true);
    try {
      const result = await sendWhatsAppWebMessage(testPhone, testMessage);
      if (result.success) {
        showToast('SUCCESS', 'تم الإرسال', 'تم إرسال الرسالة بنجاح');
        setTestPhone('');
        setTestMessage('');
      } else {
        showToast('ERROR', 'خطأ', result.error || 'فشل في إرسال الرسالة');
      }
    } catch (err: any) {
      showToast('ERROR', 'خطأ', err.message || 'فشل في إرسال الرسالة');
    } finally {
      setIsSendingTest(false);
    }
  };

  const whatsappHistory = useMemo(() => {
    const allActivities = (Object.values(activities) as Activity[][]).flat();
    return allActivities
      .filter((act: Activity) => act.type === 'WHATSAPP')
      .map((act: Activity) => {
        const lead = leads.find(l => l.id === act.leadId);
        return {
          ...act,
          leadName: lead?.companyName || 'عميل غير معروف',
          leadIndustry: lead?.industry || '',
          leadPhone: lead?.phone || '05XXXXXXXX'
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activities, leads]);

  const filteredHistory = whatsappHistory.filter(item => {
    const matchesSearch = item.leadName.toLowerCase().includes(searchTerm.toLowerCase()) || item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const isFailed = item.description.toLowerCase().includes('فشل');
    if (filterStatus === 'SUCCESS') return matchesSearch && !isFailed;
    if (filterStatus === 'FAILED') return matchesSearch && isFailed;
    return matchesSearch;
  });

  const stats = {
    total: whatsappHistory.length,
    success: whatsappHistory.filter(i => !i.description.toLowerCase().includes('فشل')).length,
    failed: whatsappHistory.filter(i => i.description.toLowerCase().includes('فشل')).length,
  };

  const handleSaveTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) return;
    
    if (editingTemplateId) {
      updateTemplate(editingTemplateId, newTemplate.name, newTemplate.content);
      showToast('SUCCESS', 'تم التحديث', 'تم تحديث قالب الرسالة بنجاح.');
    } else {
      addTemplate({
        id: Math.random().toString(36).substr(2, 9),
        name: newTemplate.name,
        content: newTemplate.content
      });
      showToast('SUCCESS', 'تم الإضافة', 'تم إنشاء قالب رسالة جديد.');
    }
    
    setNewTemplate({ name: '', content: '' });
    setShowAddTemplate(false);
    setEditingTemplateId(null);
  };

  const startEditing = (template: WhatsAppTemplate) => {
    setNewTemplate({ name: template.name, content: template.content });
    setEditingTemplateId(template.id);
    setShowAddTemplate(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelTemplate = () => {
    setNewTemplate({ name: '', content: '' });
    setShowAddTemplate(false);
    setEditingTemplateId(null);
  };

  const handleUpdatePhone = () => {
    setIsUpdatingPhone(true);
    setTimeout(() => {
      setConnectedPhone(tempPhone);
      setIsUpdatingPhone(false);
      setShowPhoneModal(false);
      showToast('SUCCESS', 'تم التحديث', 'تم تغيير رقم التواصل الأساسي بنجاح.');
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">إدارة واتساب</h1>
          <p className="text-gray-500 mt-1 font-bold">تواصل مع عملائك بذكاء وسرعة عبر Meta API</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-l border-gray-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">الحالة: متصل</span>
          </div>
          <div className="flex items-center gap-2 px-3">
            <Smartphone size={16} className="text-blue-500" />
            <span className="text-xs font-black text-gray-700">Meta Business API</span>
          </div>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button 
          onClick={() => setActiveTab('CONNECTION')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'CONNECTION' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <QrCode size={16} /> ربط واتساب
          {webStatus.status === 'connected' && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>}
        </button>
        <button 
          onClick={() => setActiveTab('LOG')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'LOG' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Clock size={16} /> سجل الرسائل
        </button>
        <button 
          onClick={() => setActiveTab('TEMPLATES')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'TEMPLATES' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Layout size={16} /> القوالب الجاهزة
        </button>
      </div>

      {activeTab === 'CONNECTION' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Connection Status Card */}
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* QR Code Section */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-4 rounded-2xl ${webStatus.status === 'connected' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {webStatus.status === 'connected' ? <Wifi size={32} /> : <QrCode size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">ربط واتساب عبر QR Code</h2>
                    <p className="text-gray-500 font-bold">اربط حسابك الشخصي لإرسال الرسائل مباشرة</p>
                  </div>
                </div>

                {/* Status Display */}
                <div className={`p-6 rounded-2xl mb-6 ${
                  webStatus.status === 'connected' ? 'bg-green-50 border border-green-100' :
                  webStatus.status === 'failed' ? 'bg-red-50 border border-red-100' :
                  webStatus.status === 'qr_ready' ? 'bg-blue-50 border border-blue-100' :
                  'bg-gray-50 border border-gray-100'
                }`}>
                  <div className="flex items-center gap-3">
                    {webStatus.status === 'connected' && <CheckCircle2 className="text-green-600" size={24} />}
                    {webStatus.status === 'disconnected' && <WifiOff className="text-gray-400" size={24} />}
                    {webStatus.status === 'qr_ready' && <QrCode className="text-blue-600" size={24} />}
                    {webStatus.status === 'connecting' && <Loader2 className="text-blue-600 animate-spin" size={24} />}
                    {webStatus.status === 'initializing' && <Loader2 className="text-blue-600 animate-spin" size={24} />}
                    {webStatus.status === 'failed' && <XCircle className="text-red-600" size={24} />}
                    <span className={`font-black ${
                      webStatus.status === 'connected' ? 'text-green-700' :
                      webStatus.status === 'failed' ? 'text-red-700' :
                      webStatus.status === 'qr_ready' ? 'text-blue-700' :
                      'text-gray-600'
                    }`}>
                      {webStatus.status === 'connected' && 'متصل - جاهز للإرسال'}
                      {webStatus.status === 'disconnected' && 'غير متصل'}
                      {webStatus.status === 'qr_ready' && 'امسح رمز QR من تطبيق واتساب'}
                      {webStatus.status === 'connecting' && 'جاري الاتصال...'}
                      {webStatus.status === 'initializing' && 'جاري التهيئة...'}
                      {webStatus.status === 'failed' && `فشل الاتصال: ${webStatus.error || 'خطأ غير معروف'}`}
                    </span>
                  </div>
                </div>

                {/* QR Code Display */}
                {webStatus.status === 'qr_ready' && webStatus.qrCode && (
                  <div className="flex flex-col items-center p-8 bg-white border-2 border-dashed border-blue-200 rounded-3xl mb-6">
                    <img src={webStatus.qrCode} alt="WhatsApp QR Code" className="w-64 h-64 rounded-2xl shadow-lg" />
                    <p className="text-sm text-gray-500 font-bold mt-4 text-center">
                      افتح واتساب على هاتفك → الإعدادات → الأجهزة المرتبطة → ربط جهاز
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  {webStatus.status === 'disconnected' && (
                    <button
                      onClick={handleInitializeWeb}
                      disabled={isInitializing}
                      className="flex-1 bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isInitializing ? (
                        <Loader2 className="animate-spin" size={24} />
                      ) : (
                        <>
                          <QrCode size={24} />
                          بدء الربط عبر QR Code
                        </>
                      )}
                    </button>
                  )}
                  {(webStatus.status === 'qr_ready' || webStatus.status === 'connecting') && (
                    <button
                      onClick={handleInitializeWeb}
                      className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={20} />
                      تحديث QR
                    </button>
                  )}
                  {webStatus.status === 'connected' && (
                    <button
                      onClick={handleDisconnectWeb}
                      className="flex-1 bg-red-50 text-red-600 px-8 py-4 rounded-2xl font-black border border-red-200 hover:bg-red-100 transition-all flex items-center justify-center gap-3"
                    >
                      <WifiOff size={24} />
                      قطع الاتصال
                    </button>
                  )}
                  {webStatus.status === 'failed' && (
                    <button
                      onClick={handleInitializeWeb}
                      disabled={isInitializing}
                      className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                    >
                      <RefreshCw size={24} />
                      إعادة المحاولة
                    </button>
                  )}
                </div>
              </div>

              {/* Test Message Section (only when connected) */}
              {webStatus.status === 'connected' && (
                <div className="flex-1 border-t lg:border-t-0 lg:border-r border-gray-100 pt-8 lg:pt-0 lg:pr-10">
                  <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <Send size={24} className="text-green-600" />
                    إرسال رسالة تجريبية
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">رقم الهاتف</label>
                      <input
                        type="text"
                        placeholder="05XXXXXXXX"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 font-bold focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">الرسالة</label>
                      <textarea
                        rows={4}
                        placeholder="اكتب رسالتك هنا..."
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 font-bold focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all resize-none"
                      />
                    </div>
                    <button
                      onClick={handleSendTestMessage}
                      disabled={isSendingTest || !testPhone || !testMessage}
                      className="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSendingTest ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <Send size={20} />
                          إرسال الرسالة
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-8 rounded-[2.5rem] border border-green-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-500 text-white rounded-2xl">
                  <Smartphone size={24} />
                </div>
                <h3 className="font-black text-green-900 text-lg">ربط واتساب الشخصي</h3>
              </div>
              <ul className="space-y-2 text-sm text-green-800 font-bold">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> إرسال مباشر من حسابك</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> لا يحتاج Meta Business API</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> مجاني بالكامل</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> سهل الإعداد</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-8 rounded-[2.5rem] border border-blue-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500 text-white rounded-2xl">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="font-black text-blue-900 text-lg">Meta Business API</h3>
              </div>
              <ul className="space-y-2 text-sm text-blue-800 font-bold">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> رسائل رسمية موثقة</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> قوالب معتمدة من Meta</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> تقارير تسليم متقدمة</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> مناسب للشركات الكبيرة</li>
              </ul>
            </div>
          </div>
        </div>
      ) : activeTab === 'LOG' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-colors">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><MessageSquare /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي المرسل</p>
                <p className="text-3xl font-black text-gray-900">{stats.total}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-green-200 transition-colors">
              <div className="p-4 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform"><CheckCircle2 /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تم التسليم</p>
                <p className="text-3xl font-black text-gray-900">{stats.success}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-colors">
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl group-hover:scale-110 transition-transform"><XCircle /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">فشل الإرسال</p>
                <p className="text-3xl font-black text-gray-900">{stats.failed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px] animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="بحث في الرسائل أو أسماء العملاء..."
                    className="w-full pr-12 pl-4 py-3.5 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner bg-white font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex p-1 bg-white border border-gray-100 rounded-2xl">
                  {['ALL', 'SUCCESS', 'FAILED'].map(t => (
                    <button
                      key={t}
                      onClick={() => setFilterStatus(t as any)}
                      className={`px-8 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${
                        filterStatus === t ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {t === 'ALL' ? 'الكل' : t === 'SUCCESS' ? 'ناجح' : 'فاشل'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">العميل</th>
                      <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">الرسالة</th>
                      <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الحالة</th>
                      <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">التوقيت</th>
                      <th className="px-10 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-all group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                              {item.leadName[0]}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{item.leadName}</p>
                              <p className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{item.leadIndustry}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 max-w-sm">
                          <p className="text-sm text-gray-600 line-clamp-1 italic font-bold">
                            {item.description.replace('تم إرسال رسالة واتساب: ', '')}
                          </p>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center justify-center">
                            {item.description.toLowerCase().includes('فشل') ? (
                              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-600 rounded-full border border-red-100 shadow-sm">
                                <XCircle size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">فشل</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-green-50 text-green-600 rounded-full border border-green-100 shadow-sm">
                                <CheckCircle2 size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">تم التسليم</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col text-[11px] text-gray-400 font-black uppercase tracking-tighter">
                            <span className="font-bold text-gray-500">{new Date(item.timestamp).toLocaleTimeString('ar-SA')}</span>
                            <span>{new Date(item.timestamp).toLocaleDateString('ar-SA')}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-left">
                          <button 
                            onClick={() => navigate(`/app/leads/${item.leadId}`)}
                            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-gray-100"
                            title="عرض العميل"
                          >
                            <ChevronLeft size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-center">
                <div className="bg-gray-50 p-10 rounded-[3rem] mb-6 relative group">
                  <MessageSquare size={64} className="text-gray-200 group-hover:text-blue-400 transition-colors duration-500" />
                  <div className="absolute top-0 right-0 bg-blue-600 w-4 h-4 rounded-full animate-ping"></div>
                </div>
                <h3 className="font-black text-2xl text-gray-900">سجل الرسائل فارغ</h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-4 font-bold leading-relaxed">ابدأ بالتواصل مع عملائك وستظهر جميع سجلات المراسلة والتقارير هنا.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Layout size={32} /></div>
               <div>
                  <h2 className="text-2xl font-black text-gray-900">مكتبة القوالب الذكية</h2>
                  <p className="text-gray-500 font-bold mt-1">وفر الوقت واستخدم قوالب مجهزة بمتغيرات ديناميكية للعملاء.</p>
               </div>
            </div>
            {!showAddTemplate && (
              <button 
                onClick={() => setShowAddTemplate(true)}
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
              >
                <Plus size={20} /> قالب جديد
              </button>
            )}
          </div>

          {showAddTemplate && (
            <div className="bg-white p-10 rounded-[3rem] border-2 border-dashed border-blue-200 shadow-2xl shadow-blue-50 space-y-8 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-blue-900 flex items-center gap-3">
                  <Wand2 className="text-blue-600" />
                  {editingTemplateId ? 'تحرير القالب' : 'إنشاء قالب ذكي'}
                </h3>
                <button onClick={handleCancelTemplate} className="p-3 hover:bg-blue-50 rounded-2xl text-blue-400 transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">اسم القالب التعريفي</label>
                    <input 
                      type="text" 
                      placeholder="مثلاً: رسالة الترحيب الأولى" 
                      className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    />
                  </div>
                  <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles size={14} /> المتغيرات المتاحة</p>
                    <div className="flex flex-wrap gap-2">
                       <span className="bg-white border border-blue-100 px-2.5 py-1 rounded-lg text-[10px] font-black text-blue-600">{'${name}'}</span>
                       <span className="bg-white border border-blue-100 px-2.5 py-1 rounded-lg text-[10px] font-black text-blue-600">{'${industry}'}</span>
                       <span className="bg-white border border-blue-100 px-2.5 py-1 rounded-lg text-[10px] font-black text-blue-600">{'${city}'}</span>
                    </div>
                    <p className="text-[10px] text-blue-400 mt-3 font-bold italic leading-relaxed">سيقوم النظام باستبدال هذه الرموز ببيانات العميل الحقيقية عند الإرسال.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">محتوى الرسالة</label>
                  <textarea 
                    rows={6}
                    placeholder="اكتب رسالتك هنا..."
                    className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all leading-relaxed"
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  />
                  <div className="flex justify-end gap-4 pt-4">
                    <button onClick={handleCancelTemplate} className="px-8 py-3 text-sm font-black text-gray-400 hover:text-gray-900 transition-colors">إلغاء</button>
                    <button 
                      onClick={handleSaveTemplate}
                      className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                    >
                      {editingTemplateId ? 'حفظ التغييرات' : 'اعتماد القالب'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-2xl transition-all group flex flex-col h-full relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
                      <Copy size={18} />
                    </div>
                    <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{tpl.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => startEditing(tpl)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => deleteTemplate(tpl.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex-1 mb-6 relative z-10 group-hover:bg-white transition-colors">
                  <p className="text-sm text-gray-600 italic font-bold leading-loose line-clamp-5">
                    "{tpl.content.replace('${name}', 'اسم العميل')}"
                  </p>
                </div>
                <button 
                  onClick={() => startEditing(tpl)}
                  className="w-full bg-white border border-gray-100 py-4 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} /> تعديل وإدارة القالب
                </button>
                <div className="absolute -bottom-10 -left-10 text-blue-50 opacity-0 group-hover:opacity-10 transition-opacity duration-700">
                  <MessageSquare size={160} className="rotate-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
        <div className="bg-gradient-to-br from-gray-900 to-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 space-y-6">
             <div className="flex items-center gap-4">
               <div className="p-4 bg-blue-500/20 text-blue-400 rounded-2xl border border-white/10 shadow-xl"><ShieldCheck size={32} /></div>
               <h3 className="text-2xl font-black tracking-tight">معايير الأمان المتقدمة</h3>
             </div>
             <p className="text-lg text-gray-400 leading-relaxed font-bold">يتم تشفير جميع سجلات المراسلة عبر بروتوكول AES-256 لضمان خصوصية بيانات عملائك وسرية عروضك التجارية.</p>
             <button className="text-sm font-black text-blue-400 hover:underline flex items-center gap-2">عرض تقرير الامتثال الرقمي <ExternalLink size={14} /></button>
          </div>
          <AlertCircle className="absolute -bottom-16 -left-16 text-white/5 rotate-12 group-hover:scale-125 transition-transform duration-1000" size={300} />
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-center space-y-6 group hover:border-blue-100 transition-all">
          <div className="flex items-center gap-6 mb-2">
            <div className="h-16 w-16 bg-green-50 text-green-600 rounded-[1.75rem] flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all duration-500 shadow-sm">
              <Smartphone size={32} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-2xl">الرقم المتصل حالياً</h3>
              <p className="text-gray-400 font-bold">متصل بـ Meta Business Manager</p>
            </div>
          </div>
          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 group-hover:bg-white transition-colors relative overflow-hidden">
             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">المعرف الرسمي (ID)</p>
             <p className="text-2xl font-mono font-black text-gray-800 tracking-widest">{connectedPhone}</p>
             <Zap size={64} className="absolute -bottom-4 -left-4 text-green-500/5 rotate-12" />
          </div>
          <button 
            onClick={() => {
              setTempPhone(connectedPhone);
              setShowPhoneModal(true);
            }}
            className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 flex items-center justify-center gap-3"
          >
            تغيير إعدادات الاتصال <ArrowLeft size={20} className="rtl-flip" />
          </button>
        </div>
      </div>

      {showPhoneModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
                  <Smartphone size={24} />
                </div>
                <h3 className="font-black text-gray-900 text-2xl">تعديل الاتصال</h3>
              </div>
              <button onClick={() => setShowPhoneModal(false)} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"><X size={28} /></button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 flex gap-4 items-start">
                <AlertCircle size={24} className="text-blue-500 flex-shrink-0 mt-1" />
                <p className="text-sm text-blue-800 leading-relaxed font-bold">يجب أن يكون الرقم الجديد مسجلاً في لوحة تحكم Meta Business API ليتمكن النظام من إرسال الرسائل الرسمية.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">رقم الهاتف الجديد (E.164)</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 px-3 py-1.5 rounded-xl font-mono text-sm border border-gray-100">
                      <Phone size={14} />
                    </div>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] py-5 pr-6 pl-16 text-xl font-mono font-black text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                      placeholder="+966 5X XXX XXXX"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-gray-50 flex gap-4">
              <button 
                onClick={() => setShowPhoneModal(false)}
                className="flex-1 px-4 py-4 rounded-2xl font-black text-gray-500 hover:bg-white border border-transparent hover:border-gray-200 transition-all"
              >
                إلغاء
              </button>
              <button 
                disabled={isUpdatingPhone || tempPhone === connectedPhone}
                onClick={handleUpdatePhone}
                className="flex-[2] bg-blue-600 text-white px-4 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPhone ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>تحديث الرقم <ArrowLeft size={20} className="rtl-flip" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppMessagesPage;
