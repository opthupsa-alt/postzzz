import React, { useState, useEffect, useCallback } from 'react';
import { Puzzle, Download, Check, Loader2, AlertCircle } from 'lucide-react';

// رابط تحميل ZIP الإضافة
const EXTENSION_ZIP_URL = '/downloads/leedz-extension.zip';

// رابط Chrome Web Store (للمستقبل)
const CHROME_STORE_URL = ''; // TODO: إضافة الرابط بعد النشر

// متغير عام لحفظ Extension ID المكتشف
let detectedExtensionId: string | null = null;

// دالة للتحقق من الإضافة عبر window message
const checkExtensionViaMessage = (): Promise<{ installed: boolean; extensionId?: string }> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ installed: false });
    }, 2000);

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'LEEDZ_EXTENSION_PONG') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        detectedExtensionId = event.data.extensionId || null;
        resolve({ installed: true, extensionId: event.data.extensionId });
      }
    };

    window.addEventListener('message', handler);
    window.postMessage({ type: 'LEEDZ_EXTENSION_PING' }, '*');
  });
};

interface ExtensionButtonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'full';
}

type ExtensionStatus = 'checking' | 'installed' | 'not-installed' | 'error';

const ExtensionButton: React.FC<ExtensionButtonProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  const [status, setStatus] = useState<ExtensionStatus>('checking');
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // فحص حالة الإضافة
  const checkExtensionStatus = useCallback(async () => {
    try {
      // فحص عبر window message
      const result = await checkExtensionViaMessage();
      
      if (result.installed) {
        setStatus('installed');
        return;
      }

      // الطريقة البديلة: فحص عبر custom event
      const extensionCheck = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1500);
        
        const handler = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        window.addEventListener('leedz-extension-pong', handler, { once: true });
        window.dispatchEvent(new CustomEvent('leedz-extension-ping'));
      });

      const isInstalled = await extensionCheck;
      setStatus(isInstalled ? 'installed' : 'not-installed');
      
    } catch (error) {
      console.error('Error checking extension:', error);
      setStatus('not-installed');
    }
  }, []);

  useEffect(() => {
    checkExtensionStatus();
    
    // إعادة الفحص عند تغيير الـ focus
    const handleFocus = () => {
      setTimeout(checkExtensionStatus, 500);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkExtensionStatus]);

  // فتح Side Panel
  const openSidePanel = async () => {
    try {
      // إرسال رسالة لفتح Side Panel
      window.postMessage({ type: 'LEEDZ_OPEN_SIDEPANEL' }, '*');
      
      // أيضاً إرسال custom event
      window.dispatchEvent(new CustomEvent('leedz-open-sidepanel'));
      
    } catch (error) {
      console.error('Error opening side panel:', error);
    }
  };

  // تحميل الإضافة
  const downloadExtension = () => {
    // إذا كان رابط Chrome Store متاح، افتحه
    if (CHROME_STORE_URL) {
      window.open(CHROME_STORE_URL, '_blank');
      return;
    }
    
    // وإلا، حمّل ملف ZIP
    const link = document.createElement('a');
    link.href = EXTENSION_ZIP_URL;
    link.download = 'leedz-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // عرض تعليمات التثبيت
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 10000);
  };

  // معالجة النقر
  const handleClick = () => {
    if (status === 'installed') {
      openSidePanel();
    } else {
      downloadExtension();
    }
  };

  // تحديد المحتوى بناءً على الحالة
  const getButtonContent = () => {
    switch (status) {
      case 'checking':
        return {
          icon: <Loader2 size={16} className="animate-spin" />,
          text: 'جاري الفحص...',
          shortText: '',
          bgClass: 'bg-gray-100 text-gray-500',
          hoverClass: 'hover:bg-gray-200',
        };
      case 'installed':
        return {
          icon: <Puzzle size={16} />,
          text: 'فتح الإضافة',
          shortText: 'Extension',
          bgClass: 'bg-green-50 text-green-600 border-green-100',
          hoverClass: 'hover:bg-green-100',
          badge: <Check size={10} className="text-green-500" />,
        };
      case 'not-installed':
        return {
          icon: <Download size={16} />,
          text: 'تحميل الإضافة',
          shortText: 'تحميل',
          bgClass: 'bg-blue-50 text-blue-600 border-blue-100',
          hoverClass: 'hover:bg-blue-100',
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} />,
          text: 'خطأ في الفحص',
          shortText: 'خطأ',
          bgClass: 'bg-red-50 text-red-600 border-red-100',
          hoverClass: 'hover:bg-red-100',
        };
    }
  };

  const content = getButtonContent();

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={status === 'checking'}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black 
          border transition-all duration-200 relative
          ${content.bgClass} ${content.hoverClass}
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title={status === 'installed' ? 'الإضافة مثبتة - انقر لفتحها' : 'الإضافة غير مثبتة - انقر للتحميل'}
      >
        {content.icon}
        <span className={variant === 'compact' ? 'hidden lg:inline' : ''}>
          {variant === 'compact' ? content.shortText : content.text}
        </span>
        {content.badge && (
          <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-green-200">
            {content.badge}
          </span>
        )}
      </button>

      {/* Tooltip تعليمات التثبيت */}
      {showTooltip && status === 'not-installed' && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <Download size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-gray-900 text-sm mb-2">تعليمات التثبيت</h4>
              <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>فك ضغط الملف المحمّل</li>
                <li>افتح <code className="bg-gray-100 px-1 rounded">chrome://extensions</code></li>
                <li>فعّل "وضع المطور" من الأعلى</li>
                <li>اضغط "تحميل إضافة غير مضغوطة"</li>
                <li>اختر مجلد الإضافة</li>
              </ol>
              <button 
                onClick={() => setShowTooltip(false)}
                className="mt-3 text-[10px] font-black text-blue-600 uppercase tracking-wider"
              >
                فهمت ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip للإضافة المثبتة */}
      {isHovered && status === 'installed' && (
        <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50">
          انقر لفتح لوحة الإضافة الجانبية
        </div>
      )}
    </div>
  );
};

export default ExtensionButton;
