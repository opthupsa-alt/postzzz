/**
 * Leedz Extension - Hidden Window Manager
 * إدارة نافذة مخفية واحدة تُعاد استخدامها لجميع عمليات البحث
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 */

class HiddenWindowManager {
  constructor() {
    this.windowId = null;
    this.tabId = null;
    this.isReady = false;
    this.lastActivity = null;
    this.config = {
      width: 1400,
      height: 900,
      defaultTimeout: 15000,
    };
  }

  /**
   * التأكد من وجود النافذة المخفية أو إنشائها
   * @returns {Promise<number>} Window ID
   */
  async ensureWindow() {
    // التحقق من وجود النافذة
    if (this.windowId) {
      try {
        const window = await chrome.windows.get(this.windowId);
        if (window) {
          this.lastActivity = Date.now();
          return this.windowId;
        }
      } catch {
        // النافذة غير موجودة
        this.windowId = null;
        this.tabId = null;
        this.isReady = false;
      }
    }

    // إنشاء نافذة مخفية جديدة
    console.log('[HiddenWindowManager] Creating new hidden window...');
    
    const window = await chrome.windows.create({
      type: 'normal',
      focused: false,
      state: 'minimized',
      width: this.config.width,
      height: this.config.height,
      left: -2000, // خارج الشاشة
      top: -2000,
    });

    this.windowId = window.id;
    this.tabId = window.tabs?.[0]?.id || null;
    this.isReady = true;
    this.lastActivity = Date.now();

    console.log('[HiddenWindowManager] Window created:', this.windowId, 'Tab:', this.tabId);
    return this.windowId;
  }

  /**
   * التأكد من وجود tab صالح
   * @returns {Promise<number>} Tab ID
   */
  async ensureTab() {
    await this.ensureWindow();

    // التحقق من وجود الـ tab
    if (this.tabId) {
      try {
        const tab = await chrome.tabs.get(this.tabId);
        if (tab) {
          return this.tabId;
        }
      } catch {
        this.tabId = null;
      }
    }

    // إنشاء tab جديد في النافذة
    const tab = await chrome.tabs.create({
      windowId: this.windowId,
      active: true,
      url: 'about:blank',
    });

    this.tabId = tab.id;
    console.log('[HiddenWindowManager] New tab created:', this.tabId);
    return this.tabId;
  }

  /**
   * التنقل إلى URL معين
   * @param {string} url - الرابط المطلوب
   * @param {number} timeout - مهلة التحميل
   * @returns {Promise<void>}
   */
  async navigateTo(url, timeout = this.config.defaultTimeout) {
    const tabId = await this.ensureTab();
    
    console.log('[HiddenWindowManager] Navigating to:', url);
    
    await chrome.tabs.update(tabId, { url });
    await this.waitForLoad(timeout);
    
    this.lastActivity = Date.now();
  }

  /**
   * انتظار تحميل الصفحة
   * @param {number} timeout - مهلة الانتظار
   * @returns {Promise<void>}
   */
  async waitForLoad(timeout = this.config.defaultTimeout) {
    const tabId = this.tabId;
    if (!tabId) throw new Error('No tab available');

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let resolved = false;

      const checkLoad = async () => {
        if (resolved) return;

        try {
          const tab = await chrome.tabs.get(tabId);
          
          if (tab.status === 'complete') {
            resolved = true;
            resolve();
            return;
          }

          if (Date.now() - startTime > timeout) {
            resolved = true;
            // لا نرفض، نكمل حتى لو لم يكتمل التحميل
            console.warn('[HiddenWindowManager] Page load timeout, continuing...');
            resolve();
            return;
          }

          setTimeout(checkLoad, 100);
        } catch (error) {
          if (!resolved) {
            resolved = true;
            reject(error);
          }
        }
      };

      // استخدام listener للتحميل
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete' && !resolved) {
          resolved = true;
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
      
      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }, timeout);

      // بدء الفحص
      checkLoad();
    });
  }

  /**
   * انتظار ظهور عناصر معينة في الصفحة
   * @param {string[]} selectors - المحددات المطلوبة
   * @param {number} timeout - مهلة الانتظار
   * @returns {Promise<{found: boolean, count: number}>}
   */
  async waitForElements(selectors, timeout = 10000) {
    const tabId = this.tabId;
    if (!tabId) return { found: false, count: 0 };

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        args: [selectors, timeout],
        func: (sels, timeoutMs) => {
          return new Promise((resolve) => {
            // فحص فوري
            const checkElements = () => {
              for (const selector of sels) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                  return { found: true, count: elements.length, selector };
                }
              }
              return null;
            };

            const existing = checkElements();
            if (existing) {
              resolve(existing);
              return;
            }

            // MutationObserver للانتظار
            let resolved = false;
            const observer = new MutationObserver(() => {
              if (resolved) return;
              const result = checkElements();
              if (result) {
                resolved = true;
                observer.disconnect();
                resolve(result);
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true,
            });

            // Timeout
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                observer.disconnect();
                resolve({ found: false, count: 0 });
              }
            }, timeoutMs);
          });
        },
      });

      return results[0]?.result || { found: false, count: 0 };
    } catch (error) {
      console.error('[HiddenWindowManager] waitForElements error:', error);
      return { found: false, count: 0 };
    }
  }

  /**
   * تنفيذ script في الصفحة
   * @param {Function} func - الدالة المطلوب تنفيذها
   * @param {any[]} args - المعاملات
   * @returns {Promise<any>}
   */
  async executeScript(func, args = []) {
    const tabId = await this.ensureTab();

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func,
        args,
      });

      this.lastActivity = Date.now();
      return results[0]?.result;
    } catch (error) {
      console.error('[HiddenWindowManager] executeScript error:', error);
      throw error;
    }
  }

  /**
   * تأخير بسيط
   * @param {number} ms - المدة بالميلي ثانية
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * تأخير عشوائي لتجنب الكشف
   * @param {number} min - الحد الأدنى
   * @param {number} max - الحد الأقصى
   * @returns {Promise<void>}
   */
  async randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(ms);
  }

  /**
   * إغلاق النافذة
   * @returns {Promise<void>}
   */
  async close() {
    if (this.windowId) {
      try {
        console.log('[HiddenWindowManager] Closing window:', this.windowId);
        await chrome.windows.remove(this.windowId);
      } catch (error) {
        console.warn('[HiddenWindowManager] Error closing window:', error);
      }
      
      this.windowId = null;
      this.tabId = null;
      this.isReady = false;
    }
  }

  /**
   * إعادة تعيين الـ tab (التنقل إلى صفحة فارغة)
   * @returns {Promise<void>}
   */
  async reset() {
    if (this.tabId) {
      try {
        await chrome.tabs.update(this.tabId, { url: 'about:blank' });
        await this.delay(500);
      } catch {
        // تجاهل الأخطاء
      }
    }
  }

  /**
   * الحصول على حالة النافذة
   * @returns {Object}
   */
  getStatus() {
    return {
      windowId: this.windowId,
      tabId: this.tabId,
      isReady: this.isReady,
      lastActivity: this.lastActivity,
    };
  }
}

// Singleton instance
const hiddenWindowManager = new HiddenWindowManager();

// تصدير للاستخدام
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HiddenWindowManager, hiddenWindowManager };
}
