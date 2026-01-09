/**
 * Leedz Extension - Smart Search Engine
 * محرك البحث الذكي متعدد الطبقات
 * 
 * الطبقات:
 * 1. Google Maps - البحث الأساسي
 * 2. Google Search - البحث عن الموقع الرسمي وحسابات Social Media
 * 3. Social Media - البحث المباشر في المنصات المتصلة
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 */

class SearchEngine {
  constructor(windowManager, smartMatcher, socialScraper = null) {
    this.windowManager = windowManager;
    this.smartMatcher = smartMatcher;
    this.socialScraper = socialScraper || (windowManager ? new SocialMediaScraper(windowManager) : null);
    this.config = {
      matchThreshold: 90,
      enableGoogleMaps: true,
      enableGoogleSearch: true,
      enableSocialMedia: true,
      enableSocialScraping: true, // تفعيل استخراج بيانات السوشيال
      maxResults: 30,
      searchDelay: 2000,
    };
    this.currentSearch = null;
    this.aborted = false;
  }

  /**
   * تحديث الإعدادات
   * @param {Object} settings - الإعدادات الجديدة
   */
  updateConfig(settings) {
    this.config = { ...this.config, ...settings };
    console.log('[SearchEngine] Config updated:', this.config);
  }

  /**
   * إلغاء البحث الحالي
   */
  abort() {
    this.aborted = true;
    console.log('[SearchEngine] Search aborted');
  }

  /**
   * البحث الذكي متعدد الطبقات
   * @param {Object} params - معاملات البحث
   * @returns {Promise<Object>} - نتيجة البحث
   */
  async search(params) {
    const {
      query,
      city,
      country,
      activity,
      searchType = 'SINGLE',
      maxResults = this.config.maxResults,
      onProgress,
      enabledLayers = null,
    } = params;

    this.aborted = false;
    this.currentSearch = { query, city, searchType, startTime: Date.now() };

    console.log('[SearchEngine] ========== STARTING SMART SEARCH ==========');
    console.log('[SearchEngine] Query:', query);
    console.log('[SearchEngine] City:', city);
    console.log('[SearchEngine] Type:', searchType);

    const searchQuery = { name: query, query, city, country, activity };
    const layers = enabledLayers || {
      googleMaps: this.config.enableGoogleMaps,
      googleSearch: this.config.enableGoogleSearch,
      socialMedia: this.config.enableSocialMedia,
    };

    let result = {
      success: false,
      data: null,
      sources: [],
      matchScore: 0,
      searchTime: 0,
      layers: {},
    };

    try {
      // ==================== Layer 1: Google Maps ====================
      if (layers.googleMaps && !this.aborted) {
        if (onProgress) onProgress(10, 'جاري البحث في خرائط جوجل...');
        
        const mapsResult = await this.searchGoogleMaps({
          query,
          city,
          country,
          searchType,
          maxResults,
          onProgress: (p, m) => onProgress && onProgress(10 + p * 0.4, m),
        });

        result.layers.googleMaps = mapsResult;

        if (mapsResult.success && mapsResult.data) {
          // التحقق من التطابق
          const match = this.smartMatcher.calculateMatch(searchQuery, mapsResult.data);
          
          console.log('[SearchEngine] Google Maps match score:', match.totalScore);
          
          if (match.isMatch) {
            result.success = true;
            result.data = { ...mapsResult.data, matchScore: match.totalScore };
            result.matchScore = match.totalScore;
            result.sources.push('googleMaps');
          } else {
            console.log('[SearchEngine] Google Maps result rejected (score:', match.totalScore, ')');
          }
        }
      }

      // ==================== Layer 2: Google Search ====================
      // نبحث إذا: لم نجد نتيجة مطابقة، أو نريد إثراء البيانات
      const shouldSearchGoogle = layers.googleSearch && !this.aborted && (
        !result.success || // لم نجد نتيجة
        !result.data?.website || // لا يوجد موقع
        Object.keys(result.data?.links || {}).length < 2 // قليل من الروابط
      );

      if (shouldSearchGoogle) {
        if (onProgress) onProgress(50, 'جاري البحث في محرك جوجل...');
        
        const searchName = result.data?.name || query;
        const googleResult = await this.searchGoogle({
          query: searchName,
          city,
          onProgress: (p, m) => onProgress && onProgress(50 + p * 0.25, m),
        });

        result.layers.googleSearch = googleResult;

        if (googleResult.success) {
          if (!result.success && googleResult.data?.officialWebsite) {
            // لم نجد في Maps، لكن وجدنا موقع رسمي
            result.data = {
              name: query,
              website: googleResult.data.officialWebsite,
              links: googleResult.data.socialLinks || {},
              source: 'googleSearch',
            };
            
            // التحقق من التطابق
            const match = this.smartMatcher.calculateMatch(searchQuery, result.data);
            if (match.totalScore >= 70) { // حد أقل لـ Google Search
              result.success = true;
              result.matchScore = match.totalScore;
              result.sources.push('googleSearch');
            }
          } else if (result.success) {
            // إثراء النتيجة الموجودة
            result.data = this.mergeResults(result.data, googleResult.data);
            if (!result.sources.includes('googleSearch')) {
              result.sources.push('googleSearch');
            }
          }
        }
      }

      // ==================== Layer 3: Social Media ====================
      const shouldSearchSocial = layers.socialMedia && !this.aborted && (
        !result.success || // لم نجد نتيجة
        Object.keys(result.data?.links || {}).filter(k => 
          ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok'].includes(k)
        ).length < 2
      );

      if (shouldSearchSocial) {
        if (onProgress) onProgress(75, 'جاري البحث في منصات التواصل...');
        
        const searchName = result.data?.name || query;
        const socialResult = await this.searchSocialMedia({
          query: searchName,
          city,
          onProgress: (p, m) => onProgress && onProgress(75 + p * 0.2, m),
        });

        result.layers.socialMedia = socialResult;

        if (socialResult.success && Object.keys(socialResult.data || {}).length > 0) {
          if (result.success) {
            // إثراء النتيجة
            result.data.links = {
              ...(result.data.links || {}),
              ...socialResult.data,
            };
            if (!result.sources.includes('socialMedia')) {
              result.sources.push('socialMedia');
            }
          } else {
            // استخدام نتائج Social Media كنتيجة أساسية
            result.data = {
              name: query,
              links: socialResult.data,
              source: 'socialMedia',
            };
            result.success = true;
            result.matchScore = 75;
            result.sources.push('socialMedia');
          }
        }
      }

      // ==================== Layer 4: Social Media Deep Scraping ====================
      // استخراج البيانات الفعلية من صفحات السوشيال
      const socialLinks = result.data?.links || {};
      const hasSocialLinks = Object.keys(socialLinks).some(k => 
        ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube', 'snapchat'].includes(k) && socialLinks[k]
      );

      if (hasSocialLinks && !this.aborted && this.socialScraper) {
        if (onProgress) onProgress(85, 'جاري تحليل حسابات التواصل الاجتماعي...');
        
        try {
          const socialData = await this.socialScraper.scrapeAll(socialLinks, (p, m) => {
            if (onProgress) onProgress(85 + p * 0.1, m);
          });

          if (Object.keys(socialData).length > 0) {
            // إضافة البيانات المفصلة
            result.data.socialProfiles = socialData;
            
            // إنشاء ملخص شامل
            result.data.socialSummary = this.socialScraper.generateSocialSummary(socialData);
            
            if (!result.sources.includes('socialScraper')) {
              result.sources.push('socialScraper');
            }

            console.log('[SearchEngine] Social scraping complete:', Object.keys(socialData));
          }
        } catch (error) {
          console.error('[SearchEngine] Social scraping error:', error);
        }
      }

      // ==================== Final Validation ====================
      if (onProgress) onProgress(95, 'جاري التحقق من النتائج...');

      if (result.success && result.data) {
        // التحقق النهائي من التطابق
        const finalMatch = this.smartMatcher.calculateMatch(searchQuery, result.data);
        result.matchScore = finalMatch.totalScore;
        result.matchDetails = finalMatch;

        if (!finalMatch.isMatch && searchType === 'SINGLE') {
          console.log('[SearchEngine] Final validation failed, score:', finalMatch.totalScore);
          result.success = false;
          result.data = null;
          result.message = `لم يتم العثور على تطابق دقيق (${finalMatch.totalScore}% < ${this.config.matchThreshold}%)`;
        }
      }

      result.searchTime = Date.now() - this.currentSearch.startTime;

      if (onProgress) onProgress(100, result.success ? 'تم العثور على نتيجة' : 'لا توجد نتائج مطابقة');

      console.log('[SearchEngine] ========== SEARCH COMPLETE ==========');
      console.log('[SearchEngine] Success:', result.success);
      console.log('[SearchEngine] Score:', result.matchScore);
      console.log('[SearchEngine] Sources:', result.sources);
      console.log('[SearchEngine] Time:', result.searchTime, 'ms');

      return result;

    } catch (error) {
      console.error('[SearchEngine] Search error:', error);
      result.error = error.message;
      result.searchTime = Date.now() - this.currentSearch.startTime;
      return result;
    }
  }

  /**
   * البحث في Google Maps
   */
  async searchGoogleMaps({ query, city, country, searchType, maxResults, onProgress }) {
    console.log('[SearchEngine] Layer 1: Google Maps');
    
    try {
      // بناء استعلام البحث
      let searchQuery = searchType === 'SINGLE' ? `"${query}"` : query;
      if (city) searchQuery += ` ${city}`;
      if (country) searchQuery += ` ${country}`;

      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      // التنقل للصفحة
      await this.windowManager.navigateTo(searchUrl);
      if (onProgress) onProgress(20, 'جاري تحميل النتائج...');

      // انتظار ظهور النتائج
      await this.windowManager.waitForElements([
        'a[href*="/maps/place/"]',
        'h1.DUwDvf',
        '.Nv2PK',
      ], 10000);

      await this.windowManager.delay(2000);
      if (onProgress) onProgress(40, 'جاري استخراج البيانات...');

      // استخراج النتائج
      const results = await this.extractGoogleMapsResults(searchType, maxResults, query);
      
      if (!results || results.length === 0) {
        return { success: false, data: null, message: 'لا توجد نتائج' };
      }

      if (onProgress) onProgress(60, 'جاري استخراج التفاصيل...');

      // للبحث الفردي، نحصل على التفاصيل الكاملة
      if (searchType === 'SINGLE') {
        const bestResult = results[0];
        
        if (bestResult.sourceUrl) {
          await this.windowManager.navigateTo(bestResult.sourceUrl);
          await this.windowManager.delay(2500);
          
          const details = await this.extractPlaceDetails();
          
          if (onProgress) onProgress(80, 'تم استخراج التفاصيل');

          return {
            success: true,
            data: {
              ...bestResult,
              ...details,
              name: details.name || bestResult.name,
            },
          };
        }

        return { success: true, data: bestResult };
      }

      // للبحث الجماعي
      return { success: true, data: results, count: results.length };

    } catch (error) {
      console.error('[SearchEngine] Google Maps error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * البحث في Google Search
   */
  async searchGoogle({ query, city, onProgress }) {
    console.log('[SearchEngine] Layer 2: Google Search');
    
    try {
      const searchQuery = city ? `${query} ${city}` : query;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=ar`;

      await this.windowManager.navigateTo(searchUrl);
      if (onProgress) onProgress(30, 'جاري تحليل النتائج...');

      await this.windowManager.delay(2000);

      const results = await this.extractGoogleSearchResults(query);
      if (onProgress) onProgress(80, 'تم استخراج المعلومات');

      return {
        success: true,
        data: results,
      };

    } catch (error) {
      console.error('[SearchEngine] Google Search error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * البحث في Social Media
   */
  async searchSocialMedia({ query, city, onProgress }) {
    console.log('[SearchEngine] Layer 3: Social Media');
    
    try {
      // الحصول على المنصات المتصلة
      const connectedPlatforms = await this.getConnectedPlatforms();
      
      if (connectedPlatforms.length === 0) {
        console.log('[SearchEngine] No connected social platforms');
        return { success: false, message: 'لا توجد منصات متصلة' };
      }

      const results = {};
      let completed = 0;

      for (const platform of connectedPlatforms) {
        if (this.aborted) break;

        try {
          if (onProgress) {
            onProgress(
              Math.round((completed / connectedPlatforms.length) * 100),
              `جاري البحث في ${platform}...`
            );
          }

          const platformResult = await this.searchPlatform(platform, query, city);
          
          if (platformResult) {
            results[platform] = platformResult;
          }

          completed++;
          await this.windowManager.delay(1500);

        } catch (error) {
          console.error(`[SearchEngine] ${platform} search error:`, error);
        }
      }

      return {
        success: Object.keys(results).length > 0,
        data: results,
      };

    } catch (error) {
      console.error('[SearchEngine] Social Media error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * البحث في منصة معينة
   */
  async searchPlatform(platform, query, city) {
    const platformConfigs = {
      instagram: {
        searchUrl: (q) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`,
        selectors: ['a[href^="/"][href$="/"]'],
      },
      twitter: {
        searchUrl: (q) => `https://x.com/search?q=${encodeURIComponent(q)}&f=user`,
        selectors: ['[data-testid="UserCell"]'],
      },
      linkedin: {
        searchUrl: (q) => `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(q)}`,
        selectors: ['.entity-result', '.search-result'],
      },
      facebook: {
        searchUrl: (q) => `https://www.facebook.com/search/pages?q=${encodeURIComponent(q)}`,
        selectors: ['[role="article"]'],
      },
      tiktok: {
        searchUrl: (q) => `https://www.tiktok.com/search/user?q=${encodeURIComponent(q)}`,
        selectors: ['[data-e2e="search-user-card"]'],
      },
    };

    const config = platformConfigs[platform];
    if (!config) return null;

    const searchQuery = city ? `${query} ${city}` : query;
    
    try {
      await this.windowManager.navigateTo(config.searchUrl(searchQuery));
      await this.windowManager.delay(3000);

      const result = await this.windowManager.executeScript(
        (selectors, searchName, platformId) => {
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              const firstEl = elements[0];
              const link = firstEl.querySelector('a')?.href || firstEl.href;
              const name = firstEl.textContent?.trim()?.substring(0, 100);
              
              if (link) {
                return { url: link, name, platform: platformId };
              }
            }
          }
          return null;
        },
        [config.selectors, query, platform]
      );

      return result;

    } catch (error) {
      console.error(`[SearchEngine] ${platform} error:`, error);
      return null;
    }
  }

  /**
   * استخراج نتائج Google Maps
   */
  async extractGoogleMapsResults(searchType, maxResults, exactMatch) {
    return await this.windowManager.executeScript(
      (type, max, match) => {
        const results = [];
        const seen = new Set();

        // محاولة استخراج من صفحة مكان واحد
        const singlePlaceName = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge');
        if (singlePlaceName) {
          const name = singlePlaceName.textContent?.trim();
          if (name) {
            results.push({
              name,
              sourceUrl: window.location.href,
              isSingleResult: true,
            });
            return results;
          }
        }

        // استخراج من قائمة النتائج
        const placeLinks = document.querySelectorAll('a[href*="/maps/place/"]');
        
        placeLinks.forEach(link => {
          if (results.length >= max) return;
          
          const href = link.href;
          if (seen.has(href)) return;
          seen.add(href);

          const container = link.closest('.Nv2PK, [role="article"], div[jsaction]') || link.parentElement;
          
          const nameEl = container?.querySelector('.fontHeadlineSmall, .qBF1Pd, .NrDZNb');
          const name = nameEl?.textContent?.trim() || link.getAttribute('aria-label') || '';

          if (!name) return;

          const ratingEl = container?.querySelector('.MW4etd, .F7nice span');
          const rating = ratingEl?.textContent?.trim();

          const addressEl = container?.querySelector('.W4Efsd');
          const address = addressEl?.textContent?.trim();

          results.push({
            name,
            sourceUrl: href,
            rating: rating || null,
            address: address || null,
          });
        });

        return results;
      },
      [searchType, maxResults, exactMatch]
    );
  }

  /**
   * استخراج تفاصيل المكان
   */
  async extractPlaceDetails() {
    return await this.windowManager.executeScript(() => {
      const details = {
        name: null,
        phone: null,
        website: null,
        email: null,
        address: null,
        rating: null,
        reviews: null,
        category: null,
        hours: null,
      };

      // الاسم
      const nameEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge');
      details.name = nameEl?.textContent?.trim();

      // الهاتف
      const phoneEl = document.querySelector('a[href^="tel:"], button[data-item-id*="phone"]');
      if (phoneEl) {
        const href = phoneEl.getAttribute('href');
        if (href?.startsWith('tel:')) {
          details.phone = href.replace('tel:', '');
        } else {
          const text = phoneEl.textContent?.trim();
          const phoneMatch = text?.match(/[\d\s\-\+\(\)]{7,}/);
          if (phoneMatch) details.phone = phoneMatch[0].trim();
        }
      }

      // الموقع
      const websiteEl = document.querySelector('a[data-item-id*="authority"], a[data-item-id*="website"]');
      if (websiteEl) {
        const href = websiteEl.getAttribute('href');
        if (href && !href.includes('google.com')) {
          details.website = href;
        }
      }

      // العنوان
      const addressEl = document.querySelector('button[data-item-id*="address"], [data-item-id*="address"]');
      if (addressEl) {
        const ariaLabel = addressEl.getAttribute('aria-label');
        details.address = ariaLabel?.replace(/^(Address|عنوان):\s*/i, '').trim() || 
                         addressEl.textContent?.trim();
      }

      // التقييم
      const ratingEl = document.querySelector('.F7nice span[aria-hidden="true"], span.ceNzKf');
      if (ratingEl) {
        const text = ratingEl.textContent?.trim();
        if (/^\d/.test(text)) details.rating = text;
      }

      // المراجعات
      const reviewsEl = document.querySelector('span[aria-label*="review"], span[aria-label*="مراجع"]');
      if (reviewsEl) {
        const label = reviewsEl.getAttribute('aria-label') || reviewsEl.textContent;
        const match = label?.match(/(\d[\d,]*)/);
        if (match) details.reviews = match[1].replace(/,/g, '');
      }

      // الفئة
      const categoryEl = document.querySelector('button[jsaction*="category"], span.DkEaL');
      details.category = categoryEl?.textContent?.trim();

      // البريد الإلكتروني
      const pageText = document.body.innerText || '';
      const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) details.email = emailMatch[0];

      return details;
    });
  }

  /**
   * استخراج نتائج Google Search
   */
  async extractGoogleSearchResults(query) {
    return await this.windowManager.executeScript((searchQuery) => {
      const BLACKLIST = [
        'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
        'instagram.com', 'linkedin.com', 'tiktok.com', 'wikipedia.org',
        'yelp.com', 'tripadvisor.com',
      ];

      const SOCIAL_PATTERNS = {
        instagram: /instagram\.com\/([^\/\?]+)/i,
        twitter: /(?:twitter|x)\.com\/([^\/\?]+)/i,
        facebook: /facebook\.com\/([^\/\?]+)/i,
        linkedin: /linkedin\.com\/(?:company|in)\/([^\/\?]+)/i,
        tiktok: /tiktok\.com\/@([^\/\?]+)/i,
      };

      const result = {
        officialWebsite: null,
        socialLinks: {},
      };

      const isBlacklisted = (url) => BLACKLIST.some(d => url.includes(d));
      
      const getSocialPlatform = (url) => {
        for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
          if (pattern.test(url)) return platform;
        }
        return null;
      };

      // استخراج من نتائج البحث
      const searchResults = document.querySelectorAll('#search .g, #rso .g');
      const candidates = [];

      searchResults.forEach((result, index) => {
        const link = result.querySelector('a[href]');
        if (!link) return;

        const href = link.href;
        if (!href || href.startsWith('javascript:')) return;

        const title = result.querySelector('h3')?.textContent?.trim() || '';

        // Social Media
        const platform = getSocialPlatform(href);
        if (platform && !result.socialLinks?.[platform]) {
          result.socialLinks = result.socialLinks || {};
          result.socialLinks[platform] = href;
        }

        // Website candidate
        if (!isBlacklisted(href) && !platform) {
          let score = 100 - (index * 10);
          if (title.toLowerCase().includes(searchQuery.toLowerCase())) score += 30;
          candidates.push({ url: href, score });
        }
      });

      // أفضل موقع
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        result.officialWebsite = candidates[0].url;
      }

      // Knowledge Panel
      const kp = document.querySelector('#rhs, .kp-wholepage');
      if (kp) {
        const kpLinks = kp.querySelectorAll('a[href]');
        kpLinks.forEach(link => {
          const platform = getSocialPlatform(link.href);
          if (platform && !result.socialLinks[platform]) {
            result.socialLinks[platform] = link.href;
          }
        });
      }

      return result;
    }, [query]);
  }

  /**
   * الحصول على المنصات المتصلة
   */
  async getConnectedPlatforms() {
    try {
      const data = await chrome.storage.local.get('leedz_social_platforms');
      const states = data.leedz_social_platforms || {};
      
      return Object.entries(states)
        .filter(([_, state]) => state.connected)
        .map(([platform]) => platform);
    } catch {
      return [];
    }
  }

  /**
   * دمج النتائج
   */
  mergeResults(primary, secondary) {
    if (!secondary) return primary;

    return {
      ...primary,
      website: primary.website || secondary.officialWebsite,
      links: {
        ...(primary.links || {}),
        googleMaps: primary.sourceUrl,
        website: secondary.officialWebsite || primary.website,
        ...(secondary.socialLinks || {}),
      },
      sources: [...(primary.sources || []), 'googleSearch'],
    };
  }
}

// تصدير
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SearchEngine };
}
