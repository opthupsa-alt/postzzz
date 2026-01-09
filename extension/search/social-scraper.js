/**
 * Leedz Extension - Social Media Scraper
 * استخراج البيانات الفعلية من صفحات السوشيال ميديا
 * 
 * المنصات المدعومة:
 * - Instagram
 * - Twitter/X
 * - Facebook
 * - LinkedIn
 * - TikTok
 * - YouTube
 * - Snapchat
 * 
 * البيانات المستخرجة:
 * - عدد المتابعين/المشتركين
 * - عدد المنشورات/الفيديوهات
 * - Bio/الوصف
 * - التحقق (verified)
 * - آخر نشاط
 * - معدل التفاعل (إن أمكن)
 * - روابط إضافية
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-09
 */

class SocialMediaScraper {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.timeout = 10000; // 10 seconds timeout per platform
  }

  /**
   * استخراج بيانات من رابط سوشيال ميديا
   * @param {string} url - رابط الصفحة
   * @param {string} platform - اسم المنصة (اختياري، يتم اكتشافه تلقائياً)
   * @returns {Promise<Object>} - البيانات المستخرجة
   */
  async scrape(url, platform = null) {
    if (!url) return null;

    // اكتشاف المنصة من الرابط
    const detectedPlatform = platform || this.detectPlatform(url);
    if (!detectedPlatform) {
      console.log('[SocialScraper] Unknown platform for URL:', url);
      return null;
    }

    console.log(`[SocialScraper] Scraping ${detectedPlatform}: ${url}`);

    try {
      // التنقل للصفحة
      await this.windowManager.navigateTo(url);
      await this.windowManager.delay(3000); // انتظار تحميل الصفحة

      // استخراج البيانات حسب المنصة
      let data = null;
      switch (detectedPlatform) {
        case 'instagram':
          data = await this.scrapeInstagram();
          break;
        case 'twitter':
          data = await this.scrapeTwitter();
          break;
        case 'facebook':
          data = await this.scrapeFacebook();
          break;
        case 'linkedin':
          data = await this.scrapeLinkedIn();
          break;
        case 'tiktok':
          data = await this.scrapeTikTok();
          break;
        case 'youtube':
          data = await this.scrapeYouTube();
          break;
        case 'snapchat':
          data = await this.scrapeSnapchat();
          break;
        default:
          console.log('[SocialScraper] No scraper for platform:', detectedPlatform);
          return null;
      }

      if (data) {
        data.platform = detectedPlatform;
        data.url = url;
        data.scrapedAt = new Date().toISOString();
      }

      return data;

    } catch (error) {
      console.error(`[SocialScraper] Error scraping ${detectedPlatform}:`, error);
      return {
        platform: detectedPlatform,
        url,
        error: error.message,
        scrapedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * استخراج بيانات من عدة روابط
   * @param {Object} socialLinks - كائن يحتوي على روابط السوشيال
   * @param {Function} onProgress - callback للتقدم
   * @returns {Promise<Object>} - البيانات المستخرجة لكل منصة
   */
  async scrapeAll(socialLinks, onProgress = null) {
    const results = {};
    const platforms = Object.keys(socialLinks).filter(k => socialLinks[k]);
    let completed = 0;

    for (const platform of platforms) {
      const url = socialLinks[platform];
      
      if (onProgress) {
        onProgress(
          Math.round((completed / platforms.length) * 100),
          `جاري تحليل ${this.getPlatformNameAr(platform)}...`
        );
      }

      const data = await this.scrape(url, platform);
      if (data) {
        results[platform] = data;
      }

      completed++;
      await this.windowManager.delay(1500); // تأخير بين المنصات
    }

    return results;
  }

  /**
   * اكتشاف المنصة من الرابط
   */
  detectPlatform(url) {
    if (!url) return null;
    const urlLower = url.toLowerCase();

    if (urlLower.includes('instagram.com')) return 'instagram';
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
    if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) return 'facebook';
    if (urlLower.includes('linkedin.com')) return 'linkedin';
    if (urlLower.includes('tiktok.com')) return 'tiktok';
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
    if (urlLower.includes('snapchat.com')) return 'snapchat';

    return null;
  }

  /**
   * اسم المنصة بالعربية
   */
  getPlatformNameAr(platform) {
    const names = {
      instagram: 'انستقرام',
      twitter: 'تويتر/X',
      facebook: 'فيسبوك',
      linkedin: 'لينكدإن',
      tiktok: 'تيك توك',
      youtube: 'يوتيوب',
      snapchat: 'سناب شات',
    };
    return names[platform] || platform;
  }

  /**
   * تحويل الأرقام المختصرة (1.2K, 5M) إلى أرقام
   */
  parseCount(text) {
    if (!text) return null;
    
    // تنظيف النص
    const cleaned = text.replace(/[,،\s]/g, '').trim();
    
    // البحث عن الأرقام مع الاختصارات
    const match = cleaned.match(/([\d.]+)\s*([KMBكمب])?/i);
    if (!match) return null;

    let num = parseFloat(match[1]);
    const suffix = (match[2] || '').toUpperCase();

    switch (suffix) {
      case 'K':
      case 'ك':
        num *= 1000;
        break;
      case 'M':
      case 'م':
        num *= 1000000;
        break;
      case 'B':
      case 'ب':
        num *= 1000000000;
        break;
    }

    return Math.round(num);
  }

  /**
   * استخراج تاريخ نسبي (منذ 3 أيام) إلى تاريخ تقريبي
   */
  parseRelativeDate(text) {
    if (!text) return null;

    const now = new Date();
    const textLower = text.toLowerCase();

    // أنماط عربية وإنجليزية
    const patterns = [
      { regex: /(\d+)\s*(second|ثاني)/i, unit: 'seconds' },
      { regex: /(\d+)\s*(minute|دقيق)/i, unit: 'minutes' },
      { regex: /(\d+)\s*(hour|ساع)/i, unit: 'hours' },
      { regex: /(\d+)\s*(day|يوم)/i, unit: 'days' },
      { regex: /(\d+)\s*(week|أسبوع)/i, unit: 'weeks' },
      { regex: /(\d+)\s*(month|شهر)/i, unit: 'months' },
      { regex: /(\d+)\s*(year|سن)/i, unit: 'years' },
    ];

    for (const { regex, unit } of patterns) {
      const match = text.match(regex);
      if (match) {
        const value = parseInt(match[1]);
        const date = new Date(now);
        
        switch (unit) {
          case 'seconds': date.setSeconds(date.getSeconds() - value); break;
          case 'minutes': date.setMinutes(date.getMinutes() - value); break;
          case 'hours': date.setHours(date.getHours() - value); break;
          case 'days': date.setDate(date.getDate() - value); break;
          case 'weeks': date.setDate(date.getDate() - (value * 7)); break;
          case 'months': date.setMonth(date.getMonth() - value); break;
          case 'years': date.setFullYear(date.getFullYear() - value); break;
        }
        
        return date.toISOString();
      }
    }

    return null;
  }

  // ==================== Instagram Scraper ====================
  async scrapeInstagram() {
    return await this.windowManager.executeScript(() => {
      const data = {
        username: null,
        displayName: null,
        bio: null,
        followers: null,
        following: null,
        posts: null,
        isVerified: false,
        isPrivate: false,
        profilePic: null,
        externalUrl: null,
        category: null,
        recentPosts: [],
      };

      try {
        // Username
        const usernameEl = document.querySelector('header h2, header h1');
        data.username = usernameEl?.textContent?.trim();

        // Display Name
        const nameEl = document.querySelector('header section span[dir="auto"]');
        data.displayName = nameEl?.textContent?.trim();

        // Bio
        const bioEl = document.querySelector('header section > div > span, header section h1 + div span');
        data.bio = bioEl?.textContent?.trim();

        // Stats (followers, following, posts)
        const statsEls = document.querySelectorAll('header section ul li, header ul li');
        statsEls.forEach(li => {
          const text = li.textContent?.toLowerCase() || '';
          const numEl = li.querySelector('span span, span');
          const numText = numEl?.textContent || '';
          
          if (text.includes('follower') || text.includes('متابع')) {
            data.followers = numText;
          } else if (text.includes('following') || text.includes('يتابع')) {
            data.following = numText;
          } else if (text.includes('post') || text.includes('منشور')) {
            data.posts = numText;
          }
        });

        // Verified badge
        data.isVerified = !!document.querySelector('header svg[aria-label*="Verified"], header [title*="Verified"]');

        // Private account
        data.isPrivate = !!document.querySelector('[aria-label*="Private"], h2 + div svg');

        // Profile picture
        const profilePicEl = document.querySelector('header img[alt*="profile"], header canvas + img');
        data.profilePic = profilePicEl?.src;

        // External URL
        const linkEl = document.querySelector('header a[href*="l.instagram.com"], header a[rel="me nofollow"]');
        data.externalUrl = linkEl?.href;

        // Category
        const categoryEl = document.querySelector('header [dir="auto"] + div');
        if (categoryEl && !categoryEl.querySelector('a')) {
          data.category = categoryEl.textContent?.trim();
        }

        // Recent posts (first 6)
        const postEls = document.querySelectorAll('article a[href*="/p/"], main article a[href*="/p/"]');
        for (let i = 0; i < Math.min(6, postEls.length); i++) {
          const post = postEls[i];
          const img = post.querySelector('img');
          data.recentPosts.push({
            url: post.href,
            thumbnail: img?.src,
          });
        }

      } catch (e) {
        console.error('[IG Scraper] Error:', e);
      }

      return data;
    });
  }

  // ==================== Twitter/X Scraper ====================
  async scrapeTwitter() {
    return await this.windowManager.executeScript(() => {
      const data = {
        username: null,
        displayName: null,
        bio: null,
        followers: null,
        following: null,
        tweets: null,
        isVerified: false,
        profilePic: null,
        headerPic: null,
        location: null,
        website: null,
        joinDate: null,
        recentTweets: [],
      };

      try {
        // Username (@handle)
        const usernameEl = document.querySelector('[data-testid="UserName"] div + div span');
        data.username = usernameEl?.textContent?.trim();

        // Display Name
        const nameEl = document.querySelector('[data-testid="UserName"] span span');
        data.displayName = nameEl?.textContent?.trim();

        // Bio
        const bioEl = document.querySelector('[data-testid="UserDescription"]');
        data.bio = bioEl?.textContent?.trim();

        // Stats
        const statsLinks = document.querySelectorAll('[href*="/following"], [href*="/followers"], [href*="/verified_followers"]');
        statsLinks.forEach(link => {
          const text = link.textContent?.toLowerCase() || '';
          const href = link.href || '';
          
          if (href.includes('/followers')) {
            data.followers = text.replace(/followers?/i, '').trim();
          } else if (href.includes('/following')) {
            data.following = text.replace(/following/i, '').trim();
          }
        });

        // Verified badge
        data.isVerified = !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"], [data-testid="icon-verified"]');

        // Profile picture
        const profilePicEl = document.querySelector('[data-testid="UserAvatar"] img, a[href$="/photo"] img');
        data.profilePic = profilePicEl?.src;

        // Header picture
        const headerEl = document.querySelector('[data-testid="UserProfileHeader_Items"] + div img, a[href$="/header_photo"] img');
        data.headerPic = headerEl?.src;

        // Location
        const locationEl = document.querySelector('[data-testid="UserProfileHeader_Items"] span[data-testid="UserLocation"]');
        data.location = locationEl?.textContent?.trim();

        // Website
        const websiteEl = document.querySelector('[data-testid="UserProfileHeader_Items"] a[href*="t.co"]');
        data.website = websiteEl?.textContent?.trim();

        // Join date
        const joinEl = document.querySelector('[data-testid="UserJoinDate"]');
        data.joinDate = joinEl?.textContent?.replace(/Joined/i, '').trim();

        // Recent tweets (first 5)
        const tweetEls = document.querySelectorAll('[data-testid="tweet"]');
        for (let i = 0; i < Math.min(5, tweetEls.length); i++) {
          const tweet = tweetEls[i];
          const textEl = tweet.querySelector('[data-testid="tweetText"]');
          const timeEl = tweet.querySelector('time');
          
          data.recentTweets.push({
            text: textEl?.textContent?.substring(0, 200),
            time: timeEl?.getAttribute('datetime'),
          });
        }

      } catch (e) {
        console.error('[Twitter Scraper] Error:', e);
      }

      return data;
    });
  }

  // ==================== Facebook Scraper ====================
  async scrapeFacebook() {
    return await this.windowManager.executeScript(() => {
      const data = {
        pageName: null,
        username: null,
        category: null,
        about: null,
        followers: null,
        likes: null,
        isVerified: false,
        profilePic: null,
        coverPic: null,
        phone: null,
        email: null,
        website: null,
        address: null,
        hours: null,
        rating: null,
        reviewCount: null,
      };

      try {
        // Page Name
        const nameEl = document.querySelector('h1[dir="auto"], [role="main"] h1');
        data.pageName = nameEl?.textContent?.trim();

        // Category
        const categoryEl = document.querySelector('h1 + div a, [role="main"] h1 + div');
        data.category = categoryEl?.textContent?.trim();

        // Followers & Likes
        const statsEls = document.querySelectorAll('[role="main"] a[href*="followers"], [role="main"] span');
        statsEls.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('follower') || text.includes('متابع')) {
            data.followers = text;
          } else if (text.includes('like') || text.includes('إعجاب')) {
            data.likes = text;
          }
        });

        // Verified
        data.isVerified = !!document.querySelector('[aria-label*="Verified"], svg[aria-label*="verified"]');

        // Profile Picture
        const profilePicEl = document.querySelector('[role="main"] svg image, [role="main"] img[alt*="profile"]');
        data.profilePic = profilePicEl?.getAttribute('xlink:href') || profilePicEl?.src;

        // Cover Picture
        const coverEl = document.querySelector('[role="main"] img[data-imgperflogname="profileCoverPhoto"]');
        data.coverPic = coverEl?.src;

        // About section info
        const aboutItems = document.querySelectorAll('[role="main"] [data-pagelet*="ProfileTileCollection"] div');
        aboutItems.forEach(item => {
          const text = item.textContent || '';
          
          if (text.match(/[\d\s\-+()]{8,}/)) {
            data.phone = data.phone || text.match(/[\d\s\-+()]{8,}/)?.[0];
          }
          if (text.includes('@') && text.includes('.')) {
            data.email = data.email || text.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
          }
          if (text.match(/https?:\/\//)) {
            data.website = data.website || text.match(/https?:\/\/[^\s]+/)?.[0];
          }
        });

        // Rating
        const ratingEl = document.querySelector('[role="main"] [aria-label*="rating"], [role="main"] span[dir="auto"]');
        if (ratingEl?.textContent?.match(/[\d.]+\s*\/\s*5/)) {
          data.rating = ratingEl.textContent.match(/([\d.]+)\s*\/\s*5/)?.[1];
        }

      } catch (e) {
        console.error('[Facebook Scraper] Error:', e);
      }

      return data;
    });
  }

  // ==================== LinkedIn Scraper ====================
  async scrapeLinkedIn() {
    return await this.windowManager.executeScript(() => {
      const data = {
        companyName: null,
        tagline: null,
        industry: null,
        companySize: null,
        headquarters: null,
        founded: null,
        specialties: [],
        followers: null,
        employees: null,
        website: null,
        about: null,
        logoUrl: null,
        coverUrl: null,
      };

      try {
        // Company Name
        const nameEl = document.querySelector('h1.org-top-card-summary__title, h1[dir="ltr"]');
        data.companyName = nameEl?.textContent?.trim();

        // Tagline
        const taglineEl = document.querySelector('.org-top-card-summary__tagline, h1 + p');
        data.tagline = taglineEl?.textContent?.trim();

        // Industry & Location
        const infoItems = document.querySelectorAll('.org-top-card-summary-info-list__info-item, .org-top-card-summary__info-item');
        infoItems.forEach((item, index) => {
          const text = item.textContent?.trim();
          if (index === 0) data.industry = text;
          if (index === 1) data.headquarters = text;
        });

        // Followers
        const followersEl = document.querySelector('.org-top-card-summary__follower-count, [data-test-id="about-us__followers"]');
        data.followers = followersEl?.textContent?.trim();

        // Employees on LinkedIn
        const employeesEl = document.querySelector('a[href*="people"] span, [data-test-id="about-us__size"]');
        data.employees = employeesEl?.textContent?.trim();

        // About
        const aboutEl = document.querySelector('.org-about-us-organization-description__text, section.org-about-module p');
        data.about = aboutEl?.textContent?.trim()?.substring(0, 500);

        // Website
        const websiteEl = document.querySelector('.org-about-us-company-module__website a, a[data-test-id="about-us__website"]');
        data.website = websiteEl?.href;

        // Company Size
        const sizeEl = document.querySelector('[data-test-id="about-us__size"] dd, .org-about-company-module__company-size-definition-text');
        data.companySize = sizeEl?.textContent?.trim();

        // Founded
        const foundedEl = document.querySelector('[data-test-id="about-us__foundedOn"] dd');
        data.founded = foundedEl?.textContent?.trim();

        // Specialties
        const specialtiesEl = document.querySelector('[data-test-id="about-us__specialties"] dd, .org-about-company-module__specialities');
        if (specialtiesEl) {
          data.specialties = specialtiesEl.textContent?.split(',').map(s => s.trim()).filter(s => s);
        }

        // Logo
        const logoEl = document.querySelector('.org-top-card-primary-content__logo img, .EntityPhoto-square-5 img');
        data.logoUrl = logoEl?.src;

        // Cover
        const coverEl = document.querySelector('.org-top-card-primary-content__cover img');
        data.coverUrl = coverEl?.src;

      } catch (e) {
        console.error('[LinkedIn Scraper] Error:', e);
      }

      return data;
    });
  }

  // ==================== TikTok Scraper ====================
  async scrapeTikTok() {
    return await this.windowManager.executeScript(() => {
      const data = {
        username: null,
        displayName: null,
        bio: null,
        followers: null,
        following: null,
        likes: null,
        videos: null,
        isVerified: false,
        profilePic: null,
        recentVideos: [],
      };

      try {
        // Username
        const usernameEl = document.querySelector('[data-e2e="user-subtitle"], h2[data-e2e="user-subtitle"]');
        data.username = usernameEl?.textContent?.trim();

        // Display Name
        const nameEl = document.querySelector('[data-e2e="user-title"], h1[data-e2e="user-title"]');
        data.displayName = nameEl?.textContent?.trim();

        // Bio
        const bioEl = document.querySelector('[data-e2e="user-bio"], h2[data-e2e="user-bio"]');
        data.bio = bioEl?.textContent?.trim();

        // Stats
        const statsEls = document.querySelectorAll('[data-e2e="following-count"], [data-e2e="followers-count"], [data-e2e="likes-count"]');
        statsEls.forEach(el => {
          const dataE2e = el.getAttribute('data-e2e');
          const value = el.textContent?.trim();
          
          if (dataE2e?.includes('following')) data.following = value;
          if (dataE2e?.includes('followers')) data.followers = value;
          if (dataE2e?.includes('likes')) data.likes = value;
        });

        // Video count
        const videoCountEl = document.querySelector('[data-e2e="user-post-item-list"] + div, .video-count');
        data.videos = videoCountEl?.textContent?.match(/\d+/)?.[0];

        // Verified
        data.isVerified = !!document.querySelector('[data-e2e="user-title"] svg, .verified-badge');

        // Profile Picture
        const profilePicEl = document.querySelector('[data-e2e="user-avatar"] img, .avatar img');
        data.profilePic = profilePicEl?.src;

        // Recent videos (first 6)
        const videoEls = document.querySelectorAll('[data-e2e="user-post-item"] a, [data-e2e="user-post-item-list"] a');
        for (let i = 0; i < Math.min(6, videoEls.length); i++) {
          const video = videoEls[i];
          const img = video.querySelector('img');
          const viewsEl = video.querySelector('[data-e2e="video-views"]');
          
          data.recentVideos.push({
            url: video.href,
            thumbnail: img?.src,
            views: viewsEl?.textContent?.trim(),
          });
        }

      } catch (e) {
        console.error('[TikTok Scraper] Error:', e);
      }

      return data;
    });
  }

  // ==================== YouTube Scraper ====================
  async scrapeYouTube() {
    return await this.windowManager.executeScript(() => {
      const data = {
        channelName: null,
        handle: null,
        description: null,
        subscribers: null,
        videos: null,
        views: null,
        joinDate: null,
        isVerified: false,
        profilePic: null,
        bannerPic: null,
        country: null,
        links: [],
        recentVideos: [],
      };

      try {
        // Channel Name
        const nameEl = document.querySelector('#channel-name yt-formatted-string, ytd-channel-name yt-formatted-string');
        data.channelName = nameEl?.textContent?.trim();

        // Handle (@username)
        const handleEl = document.querySelector('#channel-handle, ytd-channel-name + yt-formatted-string');
        data.handle = handleEl?.textContent?.trim();

        // Description
        const descEl = document.querySelector('#description-container yt-formatted-string, #about-description');
        data.description = descEl?.textContent?.trim()?.substring(0, 500);

        // Subscribers
        const subsEl = document.querySelector('#subscriber-count, yt-formatted-string#subscriber-count');
        data.subscribers = subsEl?.textContent?.trim();

        // Video count
        const videosEl = document.querySelector('#videos-count, yt-formatted-string#videos-count');
        data.videos = videosEl?.textContent?.trim();

        // Total views
        const viewsEl = document.querySelector('#right-column yt-formatted-string:nth-child(3)');
        data.views = viewsEl?.textContent?.trim();

        // Join date
        const joinEl = document.querySelector('#right-column yt-formatted-string:nth-child(2)');
        data.joinDate = joinEl?.textContent?.trim();

        // Verified
        data.isVerified = !!document.querySelector('ytd-badge-supported-renderer[badge-style="BADGE_STYLE_TYPE_VERIFIED"]');

        // Profile Picture
        const profilePicEl = document.querySelector('#avatar img, yt-img-shadow#avatar img');
        data.profilePic = profilePicEl?.src;

        // Banner
        const bannerEl = document.querySelector('#banner img, ytd-channel-banner img');
        data.bannerPic = bannerEl?.src;

        // Country
        const countryEl = document.querySelector('#details-container yt-formatted-string:last-child');
        data.country = countryEl?.textContent?.trim();

        // Links
        const linkEls = document.querySelectorAll('#links-container a, ytd-channel-external-link-view-model a');
        linkEls.forEach(link => {
          data.links.push({
            title: link.textContent?.trim(),
            url: link.href,
          });
        });

        // Recent videos (first 6)
        const videoEls = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer');
        for (let i = 0; i < Math.min(6, videoEls.length); i++) {
          const video = videoEls[i];
          const titleEl = video.querySelector('#video-title');
          const viewsEl = video.querySelector('#metadata-line span:first-child');
          const timeEl = video.querySelector('#metadata-line span:last-child');
          const thumbEl = video.querySelector('img');
          
          data.recentVideos.push({
            title: titleEl?.textContent?.trim(),
            url: titleEl?.href,
            views: viewsEl?.textContent?.trim(),
            publishedAt: timeEl?.textContent?.trim(),
            thumbnail: thumbEl?.src,
          });
        }

      } catch (e) {
        console.error('[YouTube Scraper] Error:', e);
      }

      return data;
    });
  }

  // ==================== Snapchat Scraper ====================
  async scrapeSnapchat() {
    return await this.windowManager.executeScript(() => {
      const data = {
        username: null,
        displayName: null,
        bio: null,
        subscribers: null,
        isVerified: false,
        profilePic: null,
        snapcode: null,
        stories: [],
      };

      try {
        // Username
        const usernameEl = document.querySelector('.PublicProfileCard_userName, [class*="userName"]');
        data.username = usernameEl?.textContent?.trim();

        // Display Name
        const nameEl = document.querySelector('.PublicProfileCard_displayName, [class*="displayName"]');
        data.displayName = nameEl?.textContent?.trim();

        // Bio
        const bioEl = document.querySelector('.PublicProfileCard_bio, [class*="bio"]');
        data.bio = bioEl?.textContent?.trim();

        // Subscribers
        const subsEl = document.querySelector('.PublicProfileCard_subscriberCount, [class*="subscriberCount"]');
        data.subscribers = subsEl?.textContent?.trim();

        // Verified
        data.isVerified = !!document.querySelector('[class*="verified"], svg[class*="verified"]');

        // Profile Picture
        const profilePicEl = document.querySelector('.PublicProfileCard_avatar img, [class*="avatar"] img');
        data.profilePic = profilePicEl?.src;

        // Snapcode
        const snapcodeEl = document.querySelector('.Snapcode img, [class*="snapcode"] img');
        data.snapcode = snapcodeEl?.src;

      } catch (e) {
        console.error('[Snapchat Scraper] Error:', e);
      }

      return data;
    });
  }

  /**
   * تحليل جودة الحساب بناءً على البيانات المستخرجة
   * @param {Object} data - البيانات المستخرجة
   * @returns {Object} - تحليل الجودة
   */
  analyzeAccountQuality(data) {
    if (!data || data.error) {
      return {
        score: 0,
        status: 'UNKNOWN',
        issues: ['لم يتم استخراج البيانات'],
        recommendations: [],
      };
    }

    const analysis = {
      score: 0,
      status: 'UNKNOWN',
      issues: [],
      recommendations: [],
      metrics: {},
    };

    const platform = data.platform;

    // تحليل عدد المتابعين
    const followers = this.parseCount(data.followers || data.subscribers);
    if (followers !== null) {
      analysis.metrics.followers = followers;
      
      if (followers < 100) {
        analysis.issues.push('عدد متابعين منخفض جداً');
        analysis.recommendations.push('زيادة النشاط والمحتوى لجذب متابعين');
        analysis.score += 5;
      } else if (followers < 1000) {
        analysis.issues.push('عدد متابعين منخفض');
        analysis.score += 15;
      } else if (followers < 10000) {
        analysis.score += 30;
      } else if (followers < 100000) {
        analysis.score += 45;
      } else {
        analysis.score += 50;
      }
    } else {
      analysis.issues.push('لم يتم العثور على عدد المتابعين');
    }

    // تحليل التحقق
    if (data.isVerified) {
      analysis.score += 15;
      analysis.metrics.verified = true;
    } else {
      analysis.metrics.verified = false;
      if (followers > 10000) {
        analysis.recommendations.push('التقدم للحصول على التوثيق');
      }
    }

    // تحليل Bio/الوصف
    if (data.bio || data.description || data.about) {
      const bioLength = (data.bio || data.description || data.about).length;
      if (bioLength > 50) {
        analysis.score += 10;
      } else {
        analysis.issues.push('الوصف قصير جداً');
        analysis.recommendations.push('إضافة وصف تفصيلي للنشاط');
      }
    } else {
      analysis.issues.push('لا يوجد وصف للحساب');
      analysis.recommendations.push('إضافة وصف واضح للنشاط');
    }

    // تحليل الموقع/الرابط الخارجي
    if (data.website || data.externalUrl) {
      analysis.score += 10;
      analysis.metrics.hasWebsite = true;
    } else {
      analysis.issues.push('لا يوجد رابط موقع');
      analysis.recommendations.push('إضافة رابط الموقع الرسمي');
      analysis.metrics.hasWebsite = false;
    }

    // تحليل النشاط (المنشورات الأخيرة)
    const recentContent = data.recentPosts || data.recentTweets || data.recentVideos || [];
    if (recentContent.length > 0) {
      analysis.score += 15;
      analysis.metrics.hasRecentContent = true;
      analysis.metrics.recentContentCount = recentContent.length;
    } else {
      analysis.issues.push('لا يوجد محتوى حديث');
      analysis.recommendations.push('نشر محتوى بانتظام');
      analysis.metrics.hasRecentContent = false;
    }

    // تحديد الحالة النهائية
    if (analysis.score >= 70) {
      analysis.status = 'EXCELLENT';
    } else if (analysis.score >= 50) {
      analysis.status = 'GOOD';
    } else if (analysis.score >= 30) {
      analysis.status = 'NEEDS_IMPROVEMENT';
    } else {
      analysis.status = 'POOR';
    }

    return analysis;
  }

  /**
   * إنشاء ملخص شامل لجميع حسابات السوشيال
   * @param {Object} allData - بيانات جميع المنصات
   * @returns {Object} - ملخص شامل
   */
  generateSocialSummary(allData) {
    const summary = {
      totalPlatforms: 0,
      activePlatforms: 0,
      totalFollowers: 0,
      verifiedAccounts: 0,
      overallScore: 0,
      platforms: {},
      topIssues: [],
      topRecommendations: [],
      bestPlatform: null,
      worstPlatform: null,
    };

    const platformScores = [];

    for (const [platform, data] of Object.entries(allData)) {
      if (!data || data.error) continue;

      summary.totalPlatforms++;
      
      const analysis = this.analyzeAccountQuality(data);
      summary.platforms[platform] = {
        ...data,
        analysis,
      };

      if (analysis.metrics.followers) {
        summary.totalFollowers += analysis.metrics.followers;
      }

      if (data.isVerified) {
        summary.verifiedAccounts++;
      }

      if (analysis.metrics.hasRecentContent) {
        summary.activePlatforms++;
      }

      platformScores.push({ platform, score: analysis.score });

      // جمع المشاكل والتوصيات
      analysis.issues.forEach(issue => {
        if (!summary.topIssues.includes(issue)) {
          summary.topIssues.push(issue);
        }
      });

      analysis.recommendations.forEach(rec => {
        if (!summary.topRecommendations.includes(rec)) {
          summary.topRecommendations.push(rec);
        }
      });
    }

    // حساب المتوسط
    if (platformScores.length > 0) {
      summary.overallScore = Math.round(
        platformScores.reduce((sum, p) => sum + p.score, 0) / platformScores.length
      );

      // أفضل وأسوأ منصة
      platformScores.sort((a, b) => b.score - a.score);
      summary.bestPlatform = platformScores[0]?.platform;
      summary.worstPlatform = platformScores[platformScores.length - 1]?.platform;
    }

    // اختصار القوائم
    summary.topIssues = summary.topIssues.slice(0, 5);
    summary.topRecommendations = summary.topRecommendations.slice(0, 5);

    return summary;
  }
}

// تصدير للاستخدام
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SocialMediaScraper;
}
