/**
 * Postzzz Extension - Content Script
 * يعمل على صفحات المنصة للتواصل معها
 */

(function() {
  'use strict';

  // التحقق من أننا على صفحة المنصة
  const isLeedzPlatform = () => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname.endsWith('.vercel.app') ||
           hostname.endsWith('.leedz.app') ||
           hostname === 'leedz.app';
  };

  if (!isLeedzPlatform()) {
    return;
  }

  console.log('[Leedz Content Script] Loaded on platform');

  // الاستماع لرسائل من المنصة
  window.addEventListener('message', async (event) => {
    // التحقق من المصدر
    if (event.source !== window) return;
    
    const { type, data } = event.data || {};
    
    switch (type) {
      case 'LEEDZ_EXTENSION_PING':
        // الرد بأن الإضافة مثبتة
        window.postMessage({
          type: 'LEEDZ_EXTENSION_PONG',
          installed: true,
          extensionId: chrome.runtime.id,
          version: chrome.runtime.getManifest().version,
        }, '*');
        break;
      
      case 'LEEDZ_OPEN_SIDEPANEL':
        // طلب فتح Side Panel من background
        try {
          chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL_REQUEST' }, (response) => {
            window.postMessage({
              type: 'LEEDZ_SIDEPANEL_RESPONSE',
              success: response?.success || false,
              error: response?.error,
            }, '*');
          });
        } catch (error) {
          console.error('[Leedz Content Script] Error opening side panel:', error);
        }
        break;
      
      case 'LEEDZ_GET_STATUS':
        // الحصول على حالة الإضافة
        try {
          chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' }, (response) => {
            window.postMessage({
              type: 'LEEDZ_STATUS_RESPONSE',
              installed: true,
              authenticated: response?.isAuthenticated || false,
              user: response?.user,
            }, '*');
          });
        } catch (error) {
          console.error('[Leedz Content Script] Error getting status:', error);
        }
        break;
      
      case 'LEEDZ_SYNC_AUTH':
        // مزامنة التوثيق من المنصة
        if (data?.token && data?.user) {
          try {
            chrome.runtime.sendMessage({
              type: 'SYNC_AUTH_FROM_PLATFORM',
              token: data.token,
              user: data.user,
              tenant: data.tenant,
            }, (response) => {
              window.postMessage({
                type: 'LEEDZ_SYNC_AUTH_RESPONSE',
                success: response?.success || false,
              }, '*');
            });
          } catch (error) {
            console.error('[Leedz Content Script] Error syncing auth:', error);
          }
        }
        break;
    }
  });

  // الاستماع لـ custom events
  window.addEventListener('leedz-extension-ping', () => {
    window.dispatchEvent(new CustomEvent('leedz-extension-pong', {
      detail: {
        installed: true,
        extensionId: chrome.runtime.id,
        version: chrome.runtime.getManifest().version,
      }
    }));
  });

  window.addEventListener('leedz-open-sidepanel', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL_REQUEST' });
  });

  // إعلام المنصة بأن الإضافة جاهزة
  window.postMessage({
    type: 'LEEDZ_EXTENSION_READY',
    installed: true,
    extensionId: chrome.runtime.id,
    version: chrome.runtime.getManifest().version,
  }, '*');

  // إرسال event أيضاً
  window.dispatchEvent(new CustomEvent('leedz-extension-ready', {
    detail: {
      installed: true,
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
    }
  }));

})();
