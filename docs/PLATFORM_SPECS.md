# مواصفات المنصات - Platform Specifications

## نظرة عامة

هذا الملف يحتوي على مواصفات كل منصة بالتفصيل لضمان النشر الصحيح والتحقق من الحساب.

---

## المرحلة 1: X (Twitter)

### معلومات أساسية
- **الموقع**: https://x.com
- **رابط النشر**: https://x.com/compose/post
- **رابط البروفايل**: https://x.com/{username}

### قيود المنصة
| نوع المحتوى | الحد الأقصى |
|-------------|-------------|
| نص عادي | 280 حرف |
| نص مع صورة | 280 حرف |
| نص مع فيديو | 280 حرف |
| صور | 4 صور كحد أقصى |
| فيديو | فيديو واحد، 2:20 دقيقة، 512MB |
| صيغ الصور | JPG, PNG, GIF, WEBP |
| صيغ الفيديو | MP4, MOV |

### عناصر UI للتحقق من الحساب
```javascript
// الحصول على username الحالي
const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
const username = profileLink?.href?.split('/').pop();

// أو من الـ sidebar
const sidebarProfile = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
```

### عناصر UI للنشر
```javascript
// زر Tweet/Post
const postButton = document.querySelector('[data-testid="tweetButtonInline"]') ||
                   document.querySelector('[data-testid="tweetButton"]');

// محرر النص
const editor = document.querySelector('[data-testid="tweetTextarea_0"]') ||
               document.querySelector('[role="textbox"][data-testid]');

// رفع الملفات
const fileInput = document.querySelector('input[data-testid="fileInput"]') ||
                  document.querySelector('input[type="file"][accept*="image"]');
```

### سيناريوهات النشر
1. **نص فقط**: ملء المحرر + ضغط Post
2. **نص + صورة**: رفع الصورة أولاً + انتظار + ملء النص + Post
3. **نص + فيديو**: رفع الفيديو + انتظار المعالجة + ملء النص + Post

### التحقق من نجاح النشر
```javascript
// انتظار ظهور رسالة النجاح أو اختفاء المحرر
const successIndicator = document.querySelector('[data-testid="toast"]');
// أو التحقق من إغلاق الـ composer
```

---

## المرحلة 2: Instagram

### معلومات أساسية
- **الموقع**: https://www.instagram.com
- **رابط النشر**: https://www.instagram.com/ (ثم ضغط زر Create)
- **رابط البروفايل**: https://www.instagram.com/{username}

### قيود المنصة
| نوع المحتوى | الحد الأقصى |
|-------------|-------------|
| Caption | 2,200 حرف |
| Hashtags | 30 هاشتاق |
| صور | 10 صور (Carousel) |
| فيديو Reel | 90 ثانية |
| فيديو Post | 60 ثانية |
| صيغ الصور | JPG, PNG |
| صيغ الفيديو | MP4, MOV |
| نسبة الصورة | 1:1, 4:5, 16:9 |

### عناصر UI للتحقق من الحساب
```javascript
// الحصول على username من الـ profile link
const profileLink = document.querySelector('a[href*="/' + username + '/"]');
// أو من الـ settings
const settingsUsername = document.querySelector('span._ap3a._aaco._aacw._aad6._aade');
```

### عناصر UI للنشر
```javascript
// زر Create (+)
const createBtn = document.querySelector('[aria-label="New post"]') ||
                  document.querySelector('svg[aria-label="New post"]')?.closest('a');

// رفع الملفات (يظهر بعد ضغط Create)
const fileInput = document.querySelector('input[type="file"]');

// حقل Caption (يظهر بعد اختيار الصورة)
const captionField = document.querySelector('textarea[aria-label*="caption"]');

// زر Share
const shareBtn = document.querySelector('button:has-text("Share")') ||
                 document.querySelector('[type="button"]').filter(b => b.textContent === 'Share');
```

### ملاحظات خاصة
- Instagram يتطلب صورة أو فيديو (لا يمكن نشر نص فقط)
- يجب رفع الوسائط أولاً ثم إضافة الـ Caption

---

## المرحلة 3: Facebook

### معلومات أساسية
- **الموقع**: https://www.facebook.com
- **رابط النشر**: https://www.facebook.com/ (ثم ضغط "What's on your mind")
- **رابط البروفايل**: https://www.facebook.com/{username} أو https://www.facebook.com/profile.php?id={id}

### قيود المنصة
| نوع المحتوى | الحد الأقصى |
|-------------|-------------|
| نص | 63,206 حرف |
| صور | غير محدود |
| فيديو | 240 دقيقة، 10GB |
| صيغ الصور | JPG, PNG, GIF, BMP, TIFF |
| صيغ الفيديو | MP4, MOV, AVI, WMV |

### عناصر UI للتحقق من الحساب
```javascript
// الحصول على اسم المستخدم من الـ profile
const profileLink = document.querySelector('[aria-label="Your profile"]');
const profileUrl = profileLink?.href;
```

### عناصر UI للنشر
```javascript
// فتح الـ composer
const createPostBtn = document.querySelector('[aria-label*="Create a post"]') ||
                      document.querySelector('[aria-label*="What\'s on your mind"]');

// محرر النص
const editor = document.querySelector('[contenteditable="true"][role="textbox"]');

// زر Post
const postBtn = document.querySelector('[aria-label="Post"]');
```

---

## المرحلة 4: LinkedIn

### معلومات أساسية
- **الموقع**: https://www.linkedin.com
- **رابط النشر**: https://www.linkedin.com/feed/
- **رابط البروفايل**: https://www.linkedin.com/in/{username}

### قيود المنصة
| نوع المحتوى | الحد الأقصى |
|-------------|-------------|
| نص | 3,000 حرف |
| صور | 9 صور |
| فيديو | 10 دقائق، 5GB |
| صيغ الصور | JPG, PNG, GIF |
| صيغ الفيديو | MP4, ASF, AVI |

### عناصر UI للنشر
```javascript
// زر Start a post
const startPostBtn = document.querySelector('.share-box-feed-entry__trigger');

// محرر النص (بعد فتح الـ modal)
const editor = document.querySelector('.ql-editor');

// زر Post
const postBtn = document.querySelector('.share-actions__primary-action');
```

---

## المرحلة 5: TikTok

### معلومات أساسية
- **الموقع**: https://www.tiktok.com
- **رابط النشر**: https://www.tiktok.com/creator-center/upload
- **رابط البروفايل**: https://www.tiktok.com/@{username}

### قيود المنصة
| نوع المحتوى | الحد الأقصى |
|-------------|-------------|
| Caption | 2,200 حرف |
| Hashtags | غير محدود (ضمن الـ caption) |
| فيديو | 10 دقائق، 4GB |
| صيغ الفيديو | MP4, MOV, WebM |

### ملاحظات خاصة
- TikTok يتطلب فيديو (لا يمكن نشر صورة أو نص فقط)
- يجب رفع الفيديو أولاً

---

## المرحلة 6: YouTube

### معلومات أساسية
- **الموقع**: https://studio.youtube.com
- **رابط النشر**: https://studio.youtube.com/channel/UC/videos/upload
- **رابط البروفايل**: https://www.youtube.com/@{handle} أو /channel/{id}

### قيود المنصة
| نوع المحتوى | الحد الأقصى |
|-------------|-------------|
| عنوان الفيديو | 100 حرف |
| وصف الفيديو | 5,000 حرف |
| Tags | 500 حرف إجمالي |
| فيديو | 12 ساعات، 256GB |
| صيغ الفيديو | MP4, MOV, AVI, WMV, FLV, 3GP |

### حقول إضافية مطلوبة
- **عنوان الفيديو** (مطلوب)
- **وصف الفيديو** (اختياري)
- **هل المحتوى مناسب للأطفال؟** (مطلوب)
- **الخصوصية**: عام / غير مدرج / خاص

---

## المرحلة 7: Threads

### معلومات أساسية
- **الموقع**: https://www.threads.net
- **رابط النشر**: https://www.threads.net/ (ثم ضغط Create)
- **رابط البروفايل**: https://www.threads.net/@{username}

### قيود المنصة
| نوع المحتوى | الحد الأقصى |
|-------------|-------------|
| نص | 500 حرف |
| صور | 10 صور |
| فيديو | 5 دقائق |
| صيغ الصور | JPG, PNG |
| صيغ الفيديو | MP4, MOV |

---

## المرحلة 8: Snapchat

### معلومات أساسية
- **الموقع**: https://my.snapchat.com
- **رابط النشر**: https://my.snapchat.com/
- **رابط البروفايل**: https://www.snapchat.com/add/{username}

### قيود المنصة
| نوع المحتوى | الحد الأقصى |
|-------------|-------------|
| Caption | 80 حرف (Spotlight) |
| فيديو | 60 ثانية |
| صيغ الفيديو | MP4, MOV |

### ملاحظات خاصة
- Snapchat Web له قدرات محدودة
- معظم النشر يتم عبر التطبيق

---

## آلية التحقق من الحساب

### الخطوات العامة:
1. عند إضافة منصة للعميل، يُطلب من المستخدم إدخال رابط البروفايل
2. عند محاولة النشر، نستخرج الـ username من الرابط المُدخل
3. نقارنه مع الـ username الظاهر في المنصة المفتوحة
4. إذا لم يتطابقا، نُظهر تنبيه للمستخدم

### مثال الكود:
```javascript
async function verifyAccount(platform, expectedProfileUrl, tabId) {
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    func: (platform) => {
      // استخراج username الحالي حسب المنصة
      let currentUsername = null;
      
      if (platform === 'X') {
        const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
        currentUsername = profileLink?.href?.split('/').pop();
      } else if (platform === 'INSTAGRAM') {
        // ... منطق Instagram
      }
      
      return currentUsername;
    },
    args: [platform],
  });
  
  const currentUsername = result[0]?.result;
  const expectedUsername = extractUsername(expectedProfileUrl, platform);
  
  return currentUsername === expectedUsername;
}
```

---

## حالة التنفيذ

| المنصة | الدراسة | التحقق من الحساب | النشر | التحقق من النجاح |
|--------|---------|------------------|-------|------------------|
| X | ⏳ | ⏳ | ⏳ | ⏳ |
| Instagram | ⏳ | ⏳ | ⏳ | ⏳ |
| Facebook | ⏳ | ⏳ | ⏳ | ⏳ |
| LinkedIn | ⏳ | ⏳ | ⏳ | ⏳ |
| TikTok | ⏳ | ⏳ | ⏳ | ⏳ |
| YouTube | ⏳ | ⏳ | ⏳ | ⏳ |
| Threads | ⏳ | ⏳ | ⏳ | ⏳ |
| Snapchat | ⏳ | ⏳ | ⏳ | ⏳ |

