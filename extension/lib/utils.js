/**
 * Leedz Extension - Utility Functions
 * دوال مساعدة لتحسين أداء البحث والاستخراج
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 */

// ==================== Timing Constants ====================
export const TIMING = {
  PAGE_LOAD: 3000,        // انتظار تحميل الصفحة
  RESULTS_LOAD: 2000,     // انتظار تحميل النتائج
  DETAILS_LOAD: 2000,     // انتظار تحميل التفاصيل
  SCROLL_DELAY: 1000,     // تأخير بين كل scroll
  RETRY_DELAY: 2000,      // تأخير قبل إعادة المحاولة
  CLICK_DELAY: 500,       // تأخير بعد النقر
};

// ==================== Retry Configuration ====================
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  DELAY_MULTIPLIER: 1.5,  // تأخير تصاعدي
  BASE_DELAY: 2000,
};

// ==================== Delay Functions ====================

/**
 * تأخير بسيط
 * @param {number} ms - المدة بالمللي ثانية
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * تأخير عشوائي (لتجنب الحظر)
 * @param {number} min - الحد الأدنى بالمللي ثانية
 * @param {number} max - الحد الأقصى بالمللي ثانية
 * @returns {Promise<void>}
 */
export function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
}

// ==================== Retry Logic ====================

/**
 * تنفيذ دالة مع إعادة المحاولة عند الفشل
 * @param {Function} fn - الدالة المراد تنفيذها
 * @param {Object} options - خيارات إعادة المحاولة
 * @returns {Promise<any>} - نتيجة الدالة
 */
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
    baseDelay = RETRY_CONFIG.BASE_DELAY,
    delayMultiplier = RETRY_CONFIG.DELAY_MULTIPLIER,
    onRetry = null,
    shouldRetry = () => true,
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      const delayMs = baseDelay * Math.pow(delayMultiplier, attempt - 1);
      console.log(`[Leedz Utils] Attempt ${attempt} failed, retrying in ${delayMs}ms:`, error.message);
      
      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }
      
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

// ==================== DOM Waiting Functions ====================

/**
 * انتظار ظهور عنصر في DOM
 * @param {string} selector - الـ selector للعنصر
 * @param {Object} options - خيارات الانتظار
 * @returns {Promise<Element|null>} - العنصر أو null
 */
export function waitForElement(selector, options = {}) {
  const {
    timeout = 10000,
    context = document,
    checkInterval = 100,
  } = options;

  return new Promise((resolve) => {
    // Check immediately
    const existing = context.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const startTime = Date.now();
    
    const check = () => {
      const element = context.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(null);
        return;
      }
      
      setTimeout(check, checkInterval);
    };
    
    check();
  });
}

/**
 * انتظار ظهور عناصر متعددة
 * @param {string} selector - الـ selector للعناصر
 * @param {Object} options - خيارات الانتظار
 * @returns {Promise<NodeList>} - قائمة العناصر
 */
export function waitForElements(selector, options = {}) {
  const {
    timeout = 10000,
    context = document,
    minCount = 1,
    checkInterval = 100,
  } = options;

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = () => {
      const elements = context.querySelectorAll(selector);
      if (elements.length >= minCount) {
        resolve(elements);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(elements); // Return whatever we found
        return;
      }
      
      setTimeout(check, checkInterval);
    };
    
    check();
  });
}

/**
 * انتظار استقرار DOM (توقف التغييرات)
 * @param {Element} element - العنصر المراد مراقبته
 * @param {Object} options - خيارات الانتظار
 * @returns {Promise<void>}
 */
export function waitForDomStability(element, options = {}) {
  const {
    timeout = 5000,
    stabilityTime = 500, // الوقت بدون تغييرات للاعتبار مستقر
  } = options;

  return new Promise((resolve) => {
    let lastChangeTime = Date.now();
    let resolved = false;
    
    const observer = new MutationObserver(() => {
      lastChangeTime = Date.now();
    });
    
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    
    const checkStability = () => {
      if (resolved) return;
      
      const timeSinceLastChange = Date.now() - lastChangeTime;
      
      if (timeSinceLastChange >= stabilityTime) {
        resolved = true;
        observer.disconnect();
        resolve();
        return;
      }
      
      if (Date.now() - lastChangeTime > timeout) {
        resolved = true;
        observer.disconnect();
        resolve();
        return;
      }
      
      setTimeout(checkStability, 100);
    };
    
    setTimeout(checkStability, stabilityTime);
  });
}

// ==================== String Utilities ====================

/**
 * حساب درجة التشابه بين نصين (Levenshtein-based)
 * @param {string} str1 - النص الأول
 * @param {string} str2 - النص الثاني
 * @returns {number} - درجة التشابه (0-100)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return Math.round((shorter / longer) * 100);
  }
  
  // Word-based similarity
  const words1 = s1.split(/\s+/).filter(w => w.length > 1);
  const words2 = s2.split(/\s+/).filter(w => w.length > 1);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matchingWords = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchingWords++;
        break;
      }
    }
  }
  
  const maxWords = Math.max(words1.length, words2.length);
  return Math.round((matchingWords / maxWords) * 100);
}

/**
 * تنظيف نص من الأحرف الخاصة
 * @param {string} text - النص
 * @returns {string} - النص المنظف
 */
export function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
    .trim();
}

/**
 * تنظيف اسم الشركة للمقارنة
 * @param {string} name - اسم الشركة
 * @returns {string} - الاسم المنظف
 */
export function normalizeCompanyName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, '') // Keep Arabic, English, numbers
    .replace(/\s+/g, ' ')
    .trim();
}

// ==================== Data Validation ====================

/**
 * التحقق من صحة رقم الهاتف
 * @param {string} phone - رقم الهاتف
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

/**
 * التحقق من صحة URL
 * @param {string} url - الرابط
 * @returns {boolean}
 */
export function isValidUrl(url) {
  if (!url) return false;
  try {
    new URL(url.startsWith('http') ? url : 'https://' + url);
    return true;
  } catch {
    return false;
  }
}

/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email - البريد
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ==================== Deduplication ====================

/**
 * إزالة التكرارات من قائمة النتائج
 * @param {Array} items - قائمة العناصر
 * @param {Function} keyFn - دالة لاستخراج المفتاح الفريد
 * @returns {Array} - قائمة بدون تكرارات
 */
export function deduplicate(items, keyFn = (item) => item.name?.toLowerCase()) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ==================== Logging ====================

/**
 * تسجيل رسالة مع timestamp
 * @param {string} level - مستوى الرسالة
 * @param {string} message - الرسالة
 * @param {any} data - بيانات إضافية
 */
export function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[Leedz ${timestamp}]`;
  
  switch (level) {
    case 'error':
      console.error(prefix, message, data || '');
      break;
    case 'warn':
      console.warn(prefix, message, data || '');
      break;
    case 'debug':
      console.debug(prefix, message, data || '');
      break;
    default:
      console.log(prefix, message, data || '');
  }
}

console.log('[Leedz Utils] Module loaded');
