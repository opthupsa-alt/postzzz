/**
 * Leedz Extension - Google Maps Selectors
 * ملف الـ selectors المحسنة لاستخراج البيانات من Google Maps
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 * 
 * ملاحظة: Google Maps يغير DOM بشكل متكرر، لذلك نستخدم selectors متعددة
 * مع fallbacks لضمان استمرار العمل
 */

// ==================== Phone Selectors ====================
// Selectors لاستخراج رقم الهاتف من صفحة المكان
export const PHONE_SELECTORS = [
  // Primary: data-item-id based (most reliable)
  'button[data-item-id*="phone"]',
  'a[data-item-id*="phone"]',
  
  // Secondary: aria-label based
  '[aria-label*="Phone"]',
  '[aria-label*="phone"]',
  '[aria-label*="هاتف"]',
  '[aria-label*="رقم الهاتف"]',
  '[aria-label*="الهاتف"]',
  
  // Tertiary: href tel: links
  'a[href^="tel:"]',
  
  // Quaternary: data-tooltip based
  'button[data-tooltip*="phone"]',
  'button[data-tooltip*="Phone"]',
  
  // Legacy selectors (older Google Maps versions)
  '.rogA2c[data-item-id*="phone"]',
  'button.CsEnBe[data-item-id*="phone"]',
];

// ==================== Website Selectors ====================
// Selectors لاستخراج الموقع الإلكتروني
export const WEBSITE_SELECTORS = [
  // Primary: data-item-id based
  'a[data-item-id*="authority"]',
  'a[data-item-id*="website"]',
  
  // Secondary: aria-label based
  '[aria-label*="Website"]',
  '[aria-label*="website"]',
  '[aria-label*="موقع"]',
  '[aria-label*="الموقع الإلكتروني"]',
  '[aria-label*="موقع الويب"]',
  
  // Tertiary: class-based with external link icon
  'a.CsEnBe[data-item-id*="authority"]',
  
  // Legacy
  '.rogA2c a[href]:not([href*="google.com"])',
];

// ==================== Address Selectors ====================
// Selectors لاستخراج العنوان
export const ADDRESS_SELECTORS = [
  // Primary: data-item-id based
  'button[data-item-id*="address"]',
  '[data-item-id*="address"]',
  
  // Secondary: aria-label based
  '[aria-label*="Address"]',
  '[aria-label*="address"]',
  '[aria-label*="عنوان"]',
  '[aria-label*="العنوان"]',
  
  // Tertiary: class-based
  '.rogA2c',
  '.Io6YTe',
  '.LrzXr',
  
  // Copy address button
  'button[data-tooltip*="Copy address"]',
  'button[aria-label*="Copy address"]',
];

// ==================== Name Selectors ====================
// Selectors لاستخراج اسم المكان
export const NAME_SELECTORS = [
  // Primary: h1 headers
  'h1.DUwDvf',
  'h1.fontHeadlineLarge',
  '[role="main"] h1',
  
  // Secondary: specific classes
  '.qBF1Pd',
  '.fontHeadlineSmall',
  '[class*="fontHeadline"]',
  
  // Tertiary: aria-label on main container
  '[role="main"] [aria-label]',
];

// ==================== Rating Selectors ====================
// Selectors لاستخراج التقييم
export const RATING_SELECTORS = [
  // Primary
  'div.F7nice span[aria-hidden="true"]',
  'span.ceNzKf',
  'div.fontDisplayLarge',
  
  // Secondary
  'span.MW4etd',
  '.F7nice span:first-child',
  
  // In list view
  'span[role="img"][aria-label*="star"]',
];

// ==================== Reviews Count Selectors ====================
// Selectors لاستخراج عدد المراجعات
export const REVIEWS_SELECTORS = [
  // Primary: aria-label based
  'span[aria-label*="review"]',
  'button[aria-label*="review"]',
  'span[aria-label*="مراجع"]',
  
  // Secondary: parentheses pattern
  '.F7nice span:last-child',
  'span.UY7F9',
];

// ==================== Category Selectors ====================
// Selectors لاستخراج نوع/تصنيف المكان
export const CATEGORY_SELECTORS = [
  // Primary
  'button[jsaction*="category"]',
  'span.DkEaL',
  
  // Secondary
  '.fontBodyMedium button',
  '[data-item-id*="category"]',
];

// ==================== Hours Selectors ====================
// Selectors لاستخراج ساعات العمل
export const HOURS_SELECTORS = [
  // Primary
  '[aria-label*="hour"]',
  '[aria-label*="Hours"]',
  '[aria-label*="ساعات"]',
  '[aria-label*="ساعات العمل"]',
  
  // Secondary
  '[data-item-id*="hour"]',
  '.t39EBf',
  '.o0Svhf',
];

// ==================== Place Link Selectors ====================
// Selectors للعثور على روابط الأماكن في قائمة النتائج
export const PLACE_LINK_SELECTORS = [
  // Primary: direct place links
  'a[href*="/maps/place/"]',
  
  // Secondary: feed items
  'div[role="feed"] > div a[href*="/maps/place/"]',
  
  // Tertiary: article links
  '[role="article"] a[href*="/maps/place/"]',
  
  // Legacy
  '.Nv2PK a',
  '.hfpxzc',
];

// ==================== Results Container Selectors ====================
// Selectors لحاوية النتائج (للتمرير)
export const RESULTS_CONTAINER_SELECTORS = [
  'div[role="feed"]',
  '.m6QErb.DxyBCb.kA9KIf.dS8AEf',
  '.m6QErb[aria-label]',
  '[role="main"] .m6QErb',
];

// ==================== Result Item Selectors ====================
// Selectors لعناصر النتائج الفردية
export const RESULT_ITEM_SELECTORS = [
  'div[role="feed"] > div > div[jsaction]',
  '.Nv2PK',
  '[role="article"]',
  'div[role="feed"] > div',
];

// ==================== Regex Patterns ====================
// أنماط Regex لاستخراج البيانات من النصوص
export const PATTERNS = {
  // Phone patterns (international + local)
  phone: [
    /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/g,
    /^[\d\s\-\+\(\)]{7,20}$/,
    /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/,
  ],
  
  // Rating pattern (e.g., "4.5", "4,5")
  rating: /^(\d[.,]\d)$/,
  ratingInText: /(\d[.,]\d)\s*(?:★|\()/,
  
  // Reviews count pattern (e.g., "(1,234)", "1234 reviews")
  reviews: [
    /\((\d[\d,\.]*)\)/,
    /(\d[\d,\.]*)\s*reviews?/i,
    /(\d[\d,\.]*)\s*مراجع/,
    /(\d[\d,\.]*)\s*تقييم/,
  ],
  
  // Website pattern
  website: /^(www\.|http|[a-z0-9][-a-z0-9]*\.[a-z]{2,})/i,
  
  // Email pattern
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
};

// ==================== Helper Functions ====================

/**
 * محاولة العثور على عنصر باستخدام قائمة من الـ selectors
 * @param {Document|Element} context - السياق للبحث فيه
 * @param {string[]} selectors - قائمة الـ selectors
 * @returns {Element|null} - العنصر الأول الموجود أو null
 */
export function findElement(context, selectors) {
  for (const selector of selectors) {
    try {
      const element = context.querySelector(selector);
      if (element) return element;
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return null;
}

/**
 * محاولة العثور على جميع العناصر باستخدام قائمة من الـ selectors
 * @param {Document|Element} context - السياق للبحث فيه
 * @param {string[]} selectors - قائمة الـ selectors
 * @returns {Element[]} - جميع العناصر الموجودة (بدون تكرار)
 */
export function findAllElements(context, selectors) {
  const found = new Set();
  const results = [];
  
  for (const selector of selectors) {
    try {
      const elements = context.querySelectorAll(selector);
      elements.forEach(el => {
        if (!found.has(el)) {
          found.add(el);
          results.push(el);
        }
      });
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  return results;
}

/**
 * استخراج نص من عنصر مع تنظيف
 * @param {Element|null} element - العنصر
 * @returns {string|null} - النص المنظف أو null
 */
export function extractText(element) {
  if (!element) return null;
  const text = element.textContent?.trim();
  return text && text.length > 0 ? text : null;
}

/**
 * استخراج قيمة aria-label من عنصر
 * @param {Element|null} element - العنصر
 * @returns {string|null} - قيمة aria-label أو null
 */
export function extractAriaLabel(element) {
  if (!element) return null;
  const label = element.getAttribute('aria-label')?.trim();
  return label && label.length > 0 ? label : null;
}

/**
 * استخراج رقم الهاتف من نص
 * @param {string} text - النص
 * @returns {string|null} - رقم الهاتف أو null
 */
export function extractPhoneFromText(text) {
  if (!text) return null;
  
  for (const pattern of PATTERNS.phone) {
    const match = text.match(pattern);
    if (match) {
      const phone = match[0].trim();
      // تأكد أن الرقم يحتوي على 7 أرقام على الأقل
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length >= 7) {
        return phone;
      }
    }
  }
  
  return null;
}

/**
 * استخراج التقييم من نص
 * @param {string} text - النص
 * @returns {string|null} - التقييم أو null
 */
export function extractRatingFromText(text) {
  if (!text) return null;
  
  // Try exact match first
  const exactMatch = text.match(PATTERNS.rating);
  if (exactMatch) return exactMatch[1].replace(',', '.');
  
  // Try in-text match
  const inTextMatch = text.match(PATTERNS.ratingInText);
  if (inTextMatch) return inTextMatch[1].replace(',', '.');
  
  return null;
}

/**
 * استخراج عدد المراجعات من نص
 * @param {string} text - النص
 * @returns {string|null} - عدد المراجعات أو null
 */
export function extractReviewsFromText(text) {
  if (!text) return null;
  
  for (const pattern of PATTERNS.reviews) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/,/g, '');
    }
  }
  
  return null;
}

/**
 * تنظيف وتوحيد رقم الهاتف
 * @param {string} phone - رقم الهاتف
 * @returns {string} - الرقم المنظف
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  // إزالة المسافات الزائدة والأحرف غير الضرورية
  return phone.replace(/\s+/g, ' ').trim();
}

/**
 * تنظيف URL الموقع
 * @param {string} url - الرابط
 * @returns {string|null} - الرابط المنظف أو null
 */
export function normalizeWebsite(url) {
  if (!url) return null;
  
  // تجاهل روابط Google
  if (url.includes('google.com') || url.includes('goo.gl')) {
    return null;
  }
  
  // إضافة https:// إذا لم يكن موجوداً
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return url;
}

console.log('[Leedz Selectors] Module loaded');
