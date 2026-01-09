# المرحلة 2: إضافة Google Search

> آخر تحديث: 2026-01-08
> **الحالة: ✅ مكتمل**

---

## 🎯 الهدف

إضافة طبقة بحث ثانية تستخدم محرك بحث Google العادي لاستخراج:
- الموقع الإلكتروني الرسمي
- روابط حسابات Social Media
- معلومات إضافية عن الشركة

---

## 📊 لماذا Google Search؟

| المصدر | ما يوفره |
|--------|----------|
| Google Maps | الاسم، العنوان، الهاتف، التقييم |
| Google Search | الموقع الرسمي، روابط Social Media، معلومات إضافية |

**الفائدة**: دمج المصدرين يعطي صورة أكمل عن النشاط التجاري.

---

## 🔧 التنفيذ التقني

### 1. تحديث manifest.json

```json
{
  "host_permissions": [
    "http://localhost:3001/*",
    "http://localhost:5173/*",
    "https://www.google.com/maps/*",
    "https://maps.google.com/*",
    "https://www.google.com/search*",  // 🆕
    "https://google.com/search*"        // 🆕
  ]
}
```

### 2. إنشاء google-search.js

```javascript
// extension/search/google-search.js

/**
 * البحث في Google Search واستخراج المعلومات
 * @param {string} query - اسم الشركة
 * @param {string} city - المدينة
 * @returns {Object} - المعلومات المستخرجة
 */
async function searchGoogle(query, city) {
  const searchQuery = `${query} ${city}`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  
  // فتح tab للبحث
  const tab = await createSearchTab(searchUrl);
  await waitForPageLoad(tab.id);
  
  // استخراج النتائج
  const results = await extractSearchResults(tab.id, query);
  
  // إغلاق الـ tab
  await closeTab(tab.id);
  
  return results;
}

/**
 * استخراج النتائج من صفحة البحث
 */
async function extractSearchResults(tabId, companyName) {
  return chrome.scripting.executeScript({
    target: { tabId },
    args: [companyName],
    func: (searchName) => {
      const results = {
        officialWebsite: null,
        socialLinks: {
          instagram: null,
          twitter: null,
          facebook: null,
          linkedin: null,
          tiktok: null,
        },
        additionalInfo: [],
      };
      
      // البحث عن الموقع الرسمي (أول نتيجة غالباً)
      const searchResults = document.querySelectorAll('#search .g');
      
      searchResults.forEach((result, index) => {
        const link = result.querySelector('a[href]');
        const href = link?.href || '';
        const title = result.querySelector('h3')?.textContent || '';
        
        // تحديد الموقع الرسمي
        if (index === 0 && !href.includes('google.com')) {
          results.officialWebsite = href;
        }
        
        // البحث عن روابط Social Media
        if (href.includes('instagram.com')) {
          results.socialLinks.instagram = href;
        }
        if (href.includes('twitter.com') || href.includes('x.com')) {
          results.socialLinks.twitter = href;
        }
        if (href.includes('facebook.com')) {
          results.socialLinks.facebook = href;
        }
        if (href.includes('linkedin.com')) {
          results.socialLinks.linkedin = href;
        }
        if (href.includes('tiktok.com')) {
          results.socialLinks.tiktok = href;
        }
      });
      
      // البحث في Knowledge Panel (الجانب الأيمن)
      const knowledgePanel = document.querySelector('#rhs');
      if (knowledgePanel) {
        const links = knowledgePanel.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = link.href;
          if (href.includes('instagram.com') && !results.socialLinks.instagram) {
            results.socialLinks.instagram = href;
          }
          // ... وهكذا لباقي المنصات
        });
      }
      
      return results;
    },
  });
}
```

### 3. دمج مع Orchestrator

```javascript
// extension/search/orchestrator.js

async function executeEnrichedSearch(params) {
  const { query, city, searchType } = params;
  
  // Layer 1: Google Maps
  const mapsResults = await searchGoogleMaps(params);
  
  if (searchType === 'SINGLE' && mapsResults.length > 0) {
    // Layer 2: Google Search للبحث الفردي فقط
    const searchResults = await searchGoogle(query, city);
    
    // دمج النتائج
    return mergeResults(mapsResults[0], searchResults);
  }
  
  return mapsResults;
}

function mergeResults(mapsData, searchData) {
  return {
    ...mapsData,
    website: mapsData.website || searchData.officialWebsite,
    links: {
      googleMaps: mapsData.sourceUrl,
      website: searchData.officialWebsite,
      ...searchData.socialLinks,
    },
  };
}
```

---

## 📁 الملفات الجديدة

```
extension/
├── search/
│   ├── google-search.js      # 🆕 محرك البحث
│   └── orchestrator.js       # 🆕 منسق البحث
└── extractors/
    └── search-extractor.js   # 🆕 استخراج من البحث
```

---

## ✅ قائمة المهام (مكتمل)

### التحضير
- [x] تحديث manifest.json بالصلاحيات الجديدة
- [x] إنشاء مجلد search/

### التنفيذ
- [x] إنشاء google-search.js
  - [x] دالة searchGoogle()
  - [x] دالة extractSearchResults()
  - [x] استخراج Knowledge Panel
- [x] إنشاء orchestrator.js
  - [x] دالة executeEnrichedSearch()
  - [x] دالة mergeResults()
- [x] تحديث background.js
  - [x] إضافة searchGoogle() و extractGoogleSearchResults()
  - [x] إضافة mergeSearchResults()
  - [x] دمج Google Search مع البحث الفردي (SINGLE)

### الملفات المنشأة
```
extension/
├── search/
│   ├── google-search.js      # ✅ محرك البحث
│   └── orchestrator.js       # ✅ منسق البحث
├── lib/
│   ├── selectors.js          # ✅ selectors محسنة
│   └── utils.js              # ✅ دوال مساعدة
└── manifest.json             # ✅ محدث بصلاحيات Google Search
```

---

## 🧪 حالات الاختبار

| الشركة | المدينة | الموقع المتوقع | Social Media المتوقع |
|--------|---------|----------------|---------------------|
| شركة الراجحي | الرياض | alrajhibank.com.sa | Twitter, LinkedIn |
| مطعم البيك | جدة | albaik.com | Instagram, Twitter |
| STC | الرياض | stc.com.sa | Twitter, LinkedIn, Instagram |

---

## ⚠️ التحديات والحلول

| التحدي | الحل |
|--------|------|
| CAPTCHA من Google | تأخير بين الطلبات + استخدام حساب المستخدم |
| تغيير DOM | selectors مرنة + fallbacks |
| نتائج غير دقيقة | خوارزمية مطابقة ذكية |

---

## 📈 معايير النجاح

| المعيار | الهدف |
|---------|-------|
| استخراج الموقع الرسمي | 80%+ |
| استخراج Twitter/X | 60%+ |
| استخراج Instagram | 50%+ |
| استخراج LinkedIn | 40%+ |
