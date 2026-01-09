# Leedz - معمارية نظام البحث متعدد المصادر

> آخر تحديث: 2026-01-08

---

## 🎯 الهدف الرئيسي

بناء نظام بحث ذكي متعدد الطبقات يستخدم Chrome Extension كمحرك رئيسي لجمع البيانات من مصادر متعددة:
- **Google Maps** - بيانات الأنشطة التجارية
- **Google Search** - معلومات إضافية ومواقع
- **Social Media** - حسابات التواصل الاجتماعي

---

## 📊 الوضع الحالي

### ✅ ما هو موجود ويعمل

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| Extension Base | ✅ | manifest.json, background.js, sidepanel |
| Platform Connection | ✅ | WebSocket + Polling للتواصل مع Backend |
| Auto-Login | ✅ | تسجيل دخول تلقائي من المنصة |
| Google Maps Search | ⚠️ | يعمل لكن يحتاج تحسين |
| Job System | ✅ | استقبال وتنفيذ المهام |
| Lead Saving | ✅ | حفظ النتائج في قاعدة البيانات |

### ⚠️ ما يحتاج تطوير

| المكون | الحالة | المطلوب |
|--------|--------|---------|
| Social Media Auth | ❌ | إعدادات لتسجيل الدخول للمنصات |
| Google Search | ❌ | البحث في محرك جوجل العادي |
| Social Media Search | ❌ | البحث في منصات التواصل |
| Data Merging | ❌ | دمج البيانات من مصادر متعددة |
| Verification Layer | ❌ | التحقق من صحة البيانات |

---

## 🏗️ المعمارية المقترحة

```
┌─────────────────────────────────────────────────────────────────┐
│                         LEEDZ PLATFORM                          │
│                    (React Frontend + NestJS API)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ Prospecting │    │   Jobs      │    │   Leads Database    │ │
│  │    Page     │───▶│  Controller │───▶│   (PostgreSQL)      │ │
│  └─────────────┘    └──────┬──────┘    └─────────────────────┘ │
│                            │                                    │
│                     WebSocket/Polling                           │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION                            │
│                   (Search Engine Core)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    JOB DISPATCHER                        │   │
│  │         (Receives jobs, orchestrates search)             │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│            ┌───────────────┼───────────────┐                   │
│            ▼               ▼               ▼                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   LAYER 1   │  │   LAYER 2   │  │   LAYER 3   │            │
│  │ Google Maps │  │Google Search│  │Social Media │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   DATA MERGER                            │   │
│  │    (Combines, deduplicates, validates data)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 تدفق البحث (Search Flow)

### البحث الفردي (SINGLE Search)

```
المستخدم يدخل: "شركة الراجحي" + "الرياض"
                    │
                    ▼
┌─────────────────────────────────────┐
│ Layer 1: Google Maps                │
│ - البحث عن "شركة الراجحي الرياض"    │
│ - استخراج: الاسم، العنوان، الهاتف   │
│ - استخراج: الموقع، التقييم          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Layer 2: Google Search              │
│ - البحث عن "شركة الراجحي الرياض"    │
│ - استخراج: الموقع الرسمي            │
│ - استخراج: روابط السوشيال ميديا     │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Layer 3: Social Media (Optional)    │
│ - البحث في Instagram, X, LinkedIn  │
│ - استخراج: حسابات التواصل           │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Data Merger & Verification          │
│ - دمج البيانات من كل المصادر        │
│ - التحقق من تطابق المعلومات         │
│ - حساب درجة الثقة (Confidence)      │
└─────────────────┬───────────────────┘
                  │
                  ▼
           ┌──────────────┐
           │  Lead واحد   │
           │  متكامل      │
           └──────────────┘
```

### البحث الجماعي (BULK Search)

```
المستخدم يدخل: "مطاعم" + "جدة" + (50 نتيجة)
                    │
                    ▼
┌─────────────────────────────────────┐
│ Layer 1: Google Maps ONLY           │
│ - البحث عن "مطاعم جدة"              │
│ - Scroll لتحميل المزيد              │
│ - استخراج قائمة الأنشطة             │
└─────────────────┬───────────────────┘
                  │
                  ▼
           ┌──────────────┐
           │  50 Lead     │
           │  أساسية      │
           └──────────────┘
```

---

## 📁 هيكل الملفات المقترح

```
extension/
├── manifest.json              # ✅ موجود
├── background.js              # ✅ موجود - يحتاج تعديل
├── sidepanel.html             # ✅ موجود - يحتاج تعديل
├── sidepanel.js               # ✅ موجود - يحتاج تعديل
├── icons/                     # ✅ موجود
│
├── lib/                       # 🆕 جديد
│   ├── config.js              # إعدادات المنصات
│   ├── storage.js             # إدارة التخزين المحلي
│   └── utils.js               # دوال مساعدة
│
├── search/                    # 🆕 جديد
│   ├── orchestrator.js        # منسق البحث الرئيسي
│   ├── google-maps.js         # محرك Google Maps
│   ├── google-search.js       # محرك Google Search
│   ├── social-media.js        # محرك Social Media
│   └── data-merger.js         # دمج البيانات
│
├── extractors/                # 🆕 جديد
│   ├── maps-extractor.js      # استخراج من Maps
│   ├── search-extractor.js    # استخراج من Search
│   ├── instagram-extractor.js # استخراج من Instagram
│   ├── twitter-extractor.js   # استخراج من X/Twitter
│   ├── facebook-extractor.js  # استخراج من Facebook
│   ├── linkedin-extractor.js  # استخراج من LinkedIn
│   ├── tiktok-extractor.js    # استخراج من TikTok
│   └── snapchat-extractor.js  # استخراج من Snapchat
│
└── settings/                  # 🆕 جديد
    ├── settings.html          # صفحة الإعدادات
    └── settings.js            # منطق الإعدادات
```

---

## 🔐 إعدادات منصات التواصل الاجتماعي

### المنصات المدعومة

| المنصة | URL | طريقة البحث |
|--------|-----|-------------|
| Instagram | instagram.com | البحث بالاسم |
| X (Twitter) | x.com | البحث بالاسم |
| Facebook | facebook.com | البحث بالاسم |
| LinkedIn | linkedin.com | البحث بالاسم |
| TikTok | tiktok.com | البحث بالاسم |
| Snapchat | snapchat.com | البحث بالاسم |

### آلية العمل

1. **المستخدم يفتح الإعدادات** في Extension
2. **يضغط على أيقونة المنصة** (مثل Instagram)
3. **يفتح tab جديد** لصفحة تسجيل الدخول
4. **المستخدم يسجل دخوله** بشكل طبيعي
5. **Extension يحفظ حالة الجلسة** (logged in)
6. **عند البحث** - Extension يستخدم الجلسة للبحث

---

## 📊 نموذج البيانات (Lead Schema)

```typescript
interface EnrichedLead {
  // البيانات الأساسية
  id: string;
  companyName: string;
  industry?: string;
  city?: string;
  country?: string;
  
  // بيانات الاتصال
  phones: string[];           // قد يكون أكثر من رقم
  emails: string[];           // قد يكون أكثر من إيميل
  website?: string;
  
  // العناوين
  addresses: {
    main?: string;
    branches?: string[];
  };
  
  // الروابط
  links: {
    googleMaps?: string;
    website?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
    snapchat?: string;
  };
  
  // معلومات إضافية
  rating?: number;
  reviewsCount?: number;
  category?: string;
  workingHours?: string;
  
  // بيانات التحقق
  verification: {
    confidence: number;       // 0-100
    sources: string[];        // ['google_maps', 'google_search', 'instagram']
    lastVerified: Date;
  };
  
  // Metadata
  source: 'SEARCH_SINGLE' | 'SEARCH_BULK';
  jobId: string;
  createdAt: Date;
}
```

---

## ⚡ الأداء والتحسين

### استراتيجيات تجنب البطء

1. **Parallel Tabs** - فتح عدة tabs للبحث المتوازي
2. **Caching** - تخزين النتائج مؤقتاً
3. **Progressive Loading** - عرض النتائج تدريجياً
4. **Rate Limiting** - تجنب الحظر من المنصات

### حدود البحث

| المنصة | الحد الأقصى | السبب |
|--------|-------------|-------|
| Google Maps | 60 نتيجة/بحث | حد التمرير |
| Google Search | 100 نتيجة/بحث | حد الصفحات |
| Social Media | 20 نتيجة/منصة | تجنب الحظر |

---

## 🔒 الأمان والخصوصية

1. **لا نخزن كلمات المرور** - فقط حالة الجلسة
2. **البيانات تُحفظ محلياً** في Extension storage
3. **الاتصال مشفر** مع Backend
4. **Rate Limiting** لتجنب الحظر

---

## 📝 ملاحظات التنفيذ

### الأولويات

1. ✅ **Phase 1**: تحسين Google Maps Search (موجود)
2. 🔄 **Phase 2**: إضافة Google Search
3. 🔄 **Phase 3**: إضافة Social Media Settings
4. 🔄 **Phase 4**: إضافة Social Media Search
5. 🔄 **Phase 5**: Data Merger & Verification

### التبعيات

- Phase 2 يعتمد على Phase 1
- Phase 4 يعتمد على Phase 3
- Phase 5 يعتمد على كل ما سبق
