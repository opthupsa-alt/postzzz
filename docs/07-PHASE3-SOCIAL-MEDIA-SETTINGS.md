# المرحلة 3: إعدادات Social Media

> آخر تحديث: 2026-01-08
> **الحالة: ✅ مكتمل**

---

## 🎯 الهدف

إنشاء صفحة إعدادات في Extension تمكّن المستخدم من:
- ربط حساباته على منصات التواصل الاجتماعي
- رؤية حالة الاتصال لكل منصة
- تمكين/تعطيل البحث في كل منصة

---

## 📱 المنصات المدعومة

| المنصة | الأيقونة | URL | ملاحظات |
|--------|----------|-----|---------|
| Instagram | 📷 | instagram.com | الأكثر أهمية للأنشطة التجارية |
| X (Twitter) | 𝕏 | x.com | مهم للشركات |
| Facebook | 📘 | facebook.com | صفحات الأعمال |
| LinkedIn | 💼 | linkedin.com | الشركات والمهنيين |
| TikTok | 🎵 | tiktok.com | الأنشطة الحديثة |
| Snapchat | 👻 | snapchat.com | أقل أهمية |

---

## 🎨 تصميم واجهة الإعدادات

### صفحة الإعدادات (settings.html)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ إعدادات الإضافة                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 حسابات التواصل الاجتماعي                                │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📷 Instagram                                        │   │
│  │ ○ غير متصل                    [تسجيل الدخول]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 𝕏 X (Twitter)                                       │   │
│  │ ● متصل: @username              [قطع الاتصال]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📘 Facebook                                         │   │
│  │ ○ غير متصل                    [تسجيل الدخول]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💼 LinkedIn                                         │   │
│  │ ○ غير متصل                    [تسجيل الدخول]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎵 TikTok                                           │   │
│  │ ○ غير متصل                    [تسجيل الدخول]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👻 Snapchat                                         │   │
│  │ ○ غير متصل                    [تسجيل الدخول]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚡ إعدادات البحث                                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ☑️ تضمين Google Maps في البحث                             │
│  ☑️ تضمين Google Search في البحث                           │
│  ☑️ تضمين Social Media في البحث (للمنصات المتصلة)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 التنفيذ التقني

### 1. تحديث manifest.json

```json
{
  "host_permissions": [
    // ... existing
    "https://www.instagram.com/*",
    "https://instagram.com/*",
    "https://www.x.com/*",
    "https://x.com/*",
    "https://twitter.com/*",
    "https://www.facebook.com/*",
    "https://facebook.com/*",
    "https://www.linkedin.com/*",
    "https://linkedin.com/*",
    "https://www.tiktok.com/*",
    "https://tiktok.com/*",
    "https://www.snapchat.com/*",
    "https://snapchat.com/*"
  ],
  
  "options_page": "settings/settings.html"
}
```

### 2. إنشاء settings.html

```html
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>إعدادات Leedz</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>⚙️ إعدادات الإضافة</h1>
    </header>
    
    <section class="social-accounts">
      <h2>📱 حسابات التواصل الاجتماعي</h2>
      <p class="description">قم بتسجيل الدخول للمنصات لتمكين البحث فيها</p>
      
      <div id="platformsList"></div>
    </section>
    
    <section class="search-settings">
      <h2>⚡ إعدادات البحث</h2>
      
      <label class="checkbox-item">
        <input type="checkbox" id="enableGoogleMaps" checked>
        <span>تضمين Google Maps في البحث</span>
      </label>
      
      <label class="checkbox-item">
        <input type="checkbox" id="enableGoogleSearch" checked>
        <span>تضمين Google Search في البحث</span>
      </label>
      
      <label class="checkbox-item">
        <input type="checkbox" id="enableSocialMedia" checked>
        <span>تضمين Social Media في البحث</span>
      </label>
    </section>
  </div>
  
  <script src="settings.js"></script>
</body>
</html>
```

### 3. إنشاء settings.js

```javascript
// extension/settings/settings.js

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📷', url: 'https://www.instagram.com/', loginUrl: 'https://www.instagram.com/accounts/login/' },
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', url: 'https://x.com/', loginUrl: 'https://x.com/login' },
  { id: 'facebook', name: 'Facebook', icon: '📘', url: 'https://www.facebook.com/', loginUrl: 'https://www.facebook.com/login/' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', url: 'https://www.linkedin.com/', loginUrl: 'https://www.linkedin.com/login' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', url: 'https://www.tiktok.com/', loginUrl: 'https://www.tiktok.com/login' },
  { id: 'snapchat', name: 'Snapchat', icon: '👻', url: 'https://www.snapchat.com/', loginUrl: 'https://accounts.snapchat.com/accounts/login' },
];

const STORAGE_KEY = 'leedz_social_platforms';

// تحميل حالة المنصات
async function loadPlatformStates() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || {};
}

// حفظ حالة المنصات
async function savePlatformStates(states) {
  await chrome.storage.local.set({ [STORAGE_KEY]: states });
}

// التحقق من حالة تسجيل الدخول لمنصة
async function checkPlatformLogin(platform) {
  try {
    // فتح tab مخفي للتحقق
    const tab = await chrome.tabs.create({
      url: platform.url,
      active: false,
    });
    
    await waitForTabLoad(tab.id);
    
    // حقن سكريبت للتحقق من تسجيل الدخول
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (platformId) => {
        // كل منصة لها طريقة مختلفة للتحقق
        switch (platformId) {
          case 'instagram':
            return !!document.querySelector('[aria-label="Home"]') || 
                   !!document.querySelector('[aria-label="الصفحة الرئيسية"]');
          case 'twitter':
            return !!document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
          case 'facebook':
            return !!document.querySelector('[aria-label="Your profile"]') ||
                   !!document.querySelector('[aria-label="ملفك الشخصي"]');
          case 'linkedin':
            return !!document.querySelector('.global-nav__me');
          case 'tiktok':
            return !!document.querySelector('[data-e2e="profile-icon"]');
          case 'snapchat':
            return !!document.querySelector('.logged-in-indicator');
          default:
            return false;
        }
      },
      args: [platform.id],
    });
    
    await chrome.tabs.remove(tab.id);
    
    return results[0]?.result || false;
  } catch (error) {
    console.error(`Failed to check ${platform.id}:`, error);
    return false;
  }
}

// فتح صفحة تسجيل الدخول
async function openLoginPage(platform) {
  await chrome.tabs.create({
    url: platform.loginUrl,
    active: true,
  });
}

// عرض قائمة المنصات
async function renderPlatforms() {
  const container = document.getElementById('platformsList');
  const states = await loadPlatformStates();
  
  container.innerHTML = '';
  
  for (const platform of PLATFORMS) {
    const isConnected = states[platform.id]?.connected || false;
    const username = states[platform.id]?.username || '';
    
    const item = document.createElement('div');
    item.className = `platform-item ${isConnected ? 'connected' : ''}`;
    item.innerHTML = `
      <div class="platform-info">
        <span class="platform-icon">${platform.icon}</span>
        <span class="platform-name">${platform.name}</span>
      </div>
      <div class="platform-status">
        <span class="status-indicator ${isConnected ? 'online' : 'offline'}">
          ${isConnected ? `● متصل${username ? ': ' + username : ''}` : '○ غير متصل'}
        </span>
        <button class="btn ${isConnected ? 'btn-disconnect' : 'btn-connect'}" data-platform="${platform.id}">
          ${isConnected ? 'قطع الاتصال' : 'تسجيل الدخول'}
        </button>
      </div>
    `;
    
    container.appendChild(item);
  }
  
  // إضافة event listeners
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', handlePlatformAction);
  });
}

async function handlePlatformAction(event) {
  const platformId = event.target.dataset.platform;
  const platform = PLATFORMS.find(p => p.id === platformId);
  const states = await loadPlatformStates();
  
  if (states[platformId]?.connected) {
    // قطع الاتصال
    delete states[platformId];
    await savePlatformStates(states);
  } else {
    // فتح صفحة تسجيل الدخول
    await openLoginPage(platform);
    
    // بعد فترة، التحقق من حالة تسجيل الدخول
    setTimeout(async () => {
      const isLoggedIn = await checkPlatformLogin(platform);
      if (isLoggedIn) {
        states[platformId] = { connected: true, connectedAt: new Date().toISOString() };
        await savePlatformStates(states);
        renderPlatforms();
      }
    }, 30000); // انتظر 30 ثانية
  }
  
  renderPlatforms();
}

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', () => {
  renderPlatforms();
});
```

### 4. إضافة زر الإعدادات في sidepanel

```html
<!-- في sidepanel.html -->
<button id="settingsBtn" class="settings-button" title="الإعدادات">
  ⚙️
</button>
```

```javascript
// في sidepanel.js
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
```

---

## 📁 الملفات الجديدة

```
extension/
├── settings/
│   ├── settings.html    # 🆕 صفحة الإعدادات
│   ├── settings.js      # 🆕 منطق الإعدادات
│   └── settings.css     # 🆕 تنسيق الإعدادات
└── lib/
    └── config.js        # 🆕 إعدادات المنصات
```

---

## ✅ قائمة المهام (مكتمل)

### التحضير
- [x] تحديث manifest.json بالصلاحيات الجديدة
- [x] إنشاء مجلد settings/

### التنفيذ
- [x] إنشاء settings.html
- [x] إنشاء settings.css
- [x] إنشاء settings.js
  - [x] تحميل/حفظ حالة المنصات
  - [x] التحقق من تسجيل الدخول
  - [x] فتح صفحات تسجيل الدخول
- [x] تحديث sidepanel.html بزر الإعدادات
- [x] تحديث sidepanel.js

### الملفات المنشأة
```
extension/
├── settings/
│   ├── settings.html    # ✅ صفحة الإعدادات
│   ├── settings.js      # ✅ منطق الإعدادات
│   └── settings.css     # ✅ تنسيق الإعدادات
├── manifest.json        # ✅ محدث بـ options_page و host_permissions
├── sidepanel.html       # ✅ محدث بزر الإعدادات
└── sidepanel.js         # ✅ محدث بـ event listener
```

---

## 📈 معايير النجاح

| المعيار | الهدف |
|---------|-------|
| فتح صفحة الإعدادات | يعمل 100% |
| تسجيل الدخول للمنصات | يعمل لكل منصة |
| حفظ حالة الاتصال | يستمر بعد إغلاق المتصفح |
| عرض حالة الاتصال | صحيح ومحدث |
