# المرحلة 4: البحث في Social Media

> آخر تحديث: 2026-01-08
> **الحالة: ✅ مكتمل**

---

## 🎯 الهدف

تنفيذ البحث في منصات التواصل الاجتماعي لاستخراج حسابات الشركات والأنشطة التجارية.

---

## 📱 المنصات والأولوية

| الأولوية | المنصة | السبب |
|----------|--------|-------|
| 1 | Instagram | الأكثر استخداماً للأنشطة التجارية |
| 2 | X (Twitter) | مهم للشركات الكبيرة |
| 3 | LinkedIn | الشركات والمهنيين |
| 4 | Facebook | صفحات الأعمال |
| 5 | TikTok | الأنشطة الحديثة |
| 6 | Snapchat | أقل أهمية |

---

## 🔧 التنفيذ لكل منصة

### 1. Instagram Extractor

```javascript
// extension/extractors/instagram-extractor.js

async function searchInstagram(companyName, city) {
  const searchUrl = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(companyName + ' ' + city)}`;
  
  const tab = await createSearchTab(searchUrl);
  await waitForPageLoad(tab.id);
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [companyName],
    func: (searchName) => {
      const accounts = [];
      
      // البحث عن نتائج الحسابات
      const accountItems = document.querySelectorAll('[role="button"]');
      
      accountItems.forEach(item => {
        const username = item.querySelector('span')?.textContent;
        const displayName = item.querySelector('span:nth-child(2)')?.textContent;
        
        if (username && username.startsWith('@')) {
          accounts.push({
            platform: 'instagram',
            username: username.replace('@', ''),
            displayName,
            url: `https://www.instagram.com/${username.replace('@', '')}/`,
            matchScore: calculateMatchScore(displayName, searchName),
          });
        }
      });
      
      return accounts.sort((a, b) => b.matchScore - a.matchScore);
    },
  });
  
  await closeTab(tab.id);
  return results[0]?.result || [];
}

// استخراج معلومات من صفحة الحساب
async function extractInstagramProfile(username) {
  const profileUrl = `https://www.instagram.com/${username}/`;
  
  const tab = await createSearchTab(profileUrl);
  await waitForPageLoad(tab.id);
  
  const profile = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return {
        username: document.querySelector('header h2')?.textContent,
        displayName: document.querySelector('header span')?.textContent,
        bio: document.querySelector('header section > div')?.textContent,
        followers: document.querySelector('[title*="followers"]')?.title,
        website: document.querySelector('a[rel="me nofollow noopener"]')?.href,
        isVerified: !!document.querySelector('[aria-label="Verified"]'),
        isBusiness: !!document.querySelector('[aria-label="Business"]'),
      };
    },
  });
  
  await closeTab(tab.id);
  return profile[0]?.result || null;
}
```

### 2. Twitter/X Extractor

```javascript
// extension/extractors/twitter-extractor.js

async function searchTwitter(companyName, city) {
  const searchUrl = `https://x.com/search?q=${encodeURIComponent(companyName + ' ' + city)}&f=user`;
  
  const tab = await createSearchTab(searchUrl);
  await waitForPageLoad(tab.id);
  await delay(2000); // انتظار تحميل النتائج
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [companyName],
    func: (searchName) => {
      const accounts = [];
      
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      
      userCells.forEach(cell => {
        const displayName = cell.querySelector('[dir="ltr"] > span')?.textContent;
        const username = cell.querySelector('[dir="ltr"]:nth-child(2)')?.textContent;
        const bio = cell.querySelector('[data-testid="UserDescription"]')?.textContent;
        
        if (username) {
          accounts.push({
            platform: 'twitter',
            username: username.replace('@', ''),
            displayName,
            bio,
            url: `https://x.com/${username.replace('@', '')}`,
            matchScore: calculateMatchScore(displayName, searchName),
          });
        }
      });
      
      return accounts.sort((a, b) => b.matchScore - a.matchScore);
    },
  });
  
  await closeTab(tab.id);
  return results[0]?.result || [];
}
```

### 3. LinkedIn Extractor

```javascript
// extension/extractors/linkedin-extractor.js

async function searchLinkedIn(companyName, city) {
  const searchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName + ' ' + city)}`;
  
  const tab = await createSearchTab(searchUrl);
  await waitForPageLoad(tab.id);
  await delay(2000);
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [companyName],
    func: (searchName) => {
      const companies = [];
      
      const companyCards = document.querySelectorAll('.entity-result');
      
      companyCards.forEach(card => {
        const name = card.querySelector('.entity-result__title-text')?.textContent?.trim();
        const link = card.querySelector('a.app-aware-link')?.href;
        const industry = card.querySelector('.entity-result__primary-subtitle')?.textContent?.trim();
        const location = card.querySelector('.entity-result__secondary-subtitle')?.textContent?.trim();
        
        if (name && link) {
          companies.push({
            platform: 'linkedin',
            name,
            url: link,
            industry,
            location,
            matchScore: calculateMatchScore(name, searchName),
          });
        }
      });
      
      return companies.sort((a, b) => b.matchScore - a.matchScore);
    },
  });
  
  await closeTab(tab.id);
  return results[0]?.result || [];
}
```

### 4. Facebook Extractor

```javascript
// extension/extractors/facebook-extractor.js

async function searchFacebook(companyName, city) {
  const searchUrl = `https://www.facebook.com/search/pages?q=${encodeURIComponent(companyName + ' ' + city)}`;
  
  const tab = await createSearchTab(searchUrl);
  await waitForPageLoad(tab.id);
  await delay(2000);
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [companyName],
    func: (searchName) => {
      const pages = [];
      
      const pageResults = document.querySelectorAll('[role="article"]');
      
      pageResults.forEach(result => {
        const name = result.querySelector('span[dir="auto"]')?.textContent;
        const link = result.querySelector('a[role="link"]')?.href;
        const category = result.querySelector('[role="button"] span')?.textContent;
        
        if (name && link && link.includes('facebook.com')) {
          pages.push({
            platform: 'facebook',
            name,
            url: link,
            category,
            matchScore: calculateMatchScore(name, searchName),
          });
        }
      });
      
      return pages.sort((a, b) => b.matchScore - a.matchScore);
    },
  });
  
  await closeTab(tab.id);
  return results[0]?.result || [];
}
```

### 5. TikTok Extractor

```javascript
// extension/extractors/tiktok-extractor.js

async function searchTikTok(companyName, city) {
  const searchUrl = `https://www.tiktok.com/search/user?q=${encodeURIComponent(companyName)}`;
  
  const tab = await createSearchTab(searchUrl);
  await waitForPageLoad(tab.id);
  await delay(3000); // TikTok يحتاج وقت أطول
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [companyName],
    func: (searchName) => {
      const accounts = [];
      
      const userCards = document.querySelectorAll('[data-e2e="search-user-card"]');
      
      userCards.forEach(card => {
        const username = card.querySelector('[data-e2e="search-user-unique-id"]')?.textContent;
        const displayName = card.querySelector('[data-e2e="search-user-nickname"]')?.textContent;
        const link = card.querySelector('a')?.href;
        
        if (username && link) {
          accounts.push({
            platform: 'tiktok',
            username,
            displayName,
            url: link,
            matchScore: calculateMatchScore(displayName, searchName),
          });
        }
      });
      
      return accounts.sort((a, b) => b.matchScore - a.matchScore);
    },
  });
  
  await closeTab(tab.id);
  return results[0]?.result || [];
}
```

---

## 🔄 Social Media Orchestrator

```javascript
// extension/search/social-media.js

const EXTRACTORS = {
  instagram: searchInstagram,
  twitter: searchTwitter,
  linkedin: searchLinkedIn,
  facebook: searchFacebook,
  tiktok: searchTikTok,
  snapchat: searchSnapchat,
};

async function searchSocialMedia(companyName, city, enabledPlatforms) {
  const results = {
    instagram: null,
    twitter: null,
    linkedin: null,
    facebook: null,
    tiktok: null,
    snapchat: null,
  };
  
  // البحث في المنصات المفعلة فقط
  for (const platform of enabledPlatforms) {
    if (EXTRACTORS[platform]) {
      try {
        const platformResults = await EXTRACTORS[platform](companyName, city);
        if (platformResults.length > 0) {
          results[platform] = platformResults[0]; // أفضل نتيجة
        }
      } catch (error) {
        console.error(`Failed to search ${platform}:`, error);
      }
      
      // تأخير بين المنصات لتجنب الحظر
      await delay(2000);
    }
  }
  
  return results;
}

// دالة حساب درجة المطابقة
function calculateMatchScore(name, searchName) {
  if (!name || !searchName) return 0;
  
  const normalizedName = name.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '');
  const normalizedSearch = searchName.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '');
  
  if (normalizedName === normalizedSearch) return 100;
  if (normalizedName.includes(normalizedSearch)) return 80;
  if (normalizedSearch.includes(normalizedName)) return 70;
  
  // حساب الكلمات المشتركة
  const nameWords = normalizedName.split(/\s+/);
  const searchWords = normalizedSearch.split(/\s+/);
  const commonWords = nameWords.filter(w => searchWords.includes(w));
  
  return Math.round((commonWords.length / Math.max(nameWords.length, searchWords.length)) * 60);
}
```

---

## 📁 الملفات الجديدة

```
extension/
├── search/
│   └── social-media.js       # 🆕 منسق البحث في Social Media
└── extractors/
    ├── instagram-extractor.js # 🆕
    ├── twitter-extractor.js   # 🆕
    ├── linkedin-extractor.js  # 🆕
    ├── facebook-extractor.js  # 🆕
    ├── tiktok-extractor.js    # 🆕
    └── snapchat-extractor.js  # 🆕
```

---

## ✅ قائمة المهام (مكتمل)

### التنفيذ
- [x] إنشاء social-media.js (يتضمن جميع extractors)
  - [x] searchInstagram()
  - [x] searchTwitter()
  - [x] searchLinkedIn()
  - [x] searchFacebook()
  - [x] searchTikTok()
- [x] دالة searchSocialMedia() الرئيسية
- [x] دالة getConnectedPlatforms()
- [x] دالة calculateMatchScore()

### الملفات المنشأة
```
extension/
└── search/
    └── social-media.js    # ✅ منسق البحث + جميع extractors
```

---

## ⚠️ التحديات والحلول

| التحدي | الحل |
|--------|------|
| حظر الحساب | Rate limiting + تأخير عشوائي |
| CAPTCHA | استخدام جلسة المستخدم |
| تغيير DOM | Selectors مرنة + fallbacks |
| بطء الأداء | البحث المتوازي (محدود) |

---

## 📈 معايير النجاح

| المنصة | نسبة النجاح المستهدفة |
|--------|----------------------|
| Instagram | 85%+ |
| Twitter/X | 80%+ |
| LinkedIn | 75%+ |
| Facebook | 70%+ |
| TikTok | 65%+ |
| Snapchat | 50%+ |
