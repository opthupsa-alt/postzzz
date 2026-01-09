/**
 * Leedz Extension - Google Search Module
 * البحث في محرك بحث Google لاستخراج معلومات إضافية
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 * 
 * الهدف:
 * - استخراج الموقع الإلكتروني الرسمي
 * - استخراج روابط حسابات Social Media
 * - استخراج معلومات إضافية من Knowledge Panel
 */

// ==================== Selectors ====================
const GOOGLE_SEARCH_SELECTORS = {
  // نتائج البحث الرئيسية
  searchResults: [
    '#search .g',
    '#rso .g',
    '.g[data-hveid]',
    '[data-sokoban-container] .g',
  ],
  
  // روابط النتائج
  resultLink: [
    'a[href]:not([href*="google.com"])',
    'a[data-ved]',
    '.yuRUbf a',
  ],
  
  // عنوان النتيجة
  resultTitle: [
    'h3',
    '.LC20lb',
    '[data-header-feature] h3',
  ],
  
  // وصف النتيجة
  resultDescription: [
    '.VwiC3b',
    '.IsZvec',
    '.lEBKkf span',
  ],
  
  // Knowledge Panel (الجانب الأيمن)
  knowledgePanel: [
    '#rhs',
    '.kp-wholepage',
    '[data-attrid="kc:/"]',
  ],
  
  // روابط في Knowledge Panel
  knowledgePanelLinks: [
    '#rhs a[href]',
    '.kp-wholepage a[href]',
    '[data-attrid] a[href]',
  ],
  
  // معلومات الشركة في Knowledge Panel
  companyInfo: [
    '[data-attrid="kc:/business/business_operation:website"]',
    '[data-attrid="kc:/common/topic:social media presence"]',
    '.IzNS7c',
  ],
};

// ==================== Social Media Patterns ====================
const SOCIAL_MEDIA_PATTERNS = {
  instagram: [
    /instagram\.com\/([^\/\?]+)/i,
    /instagr\.am\/([^\/\?]+)/i,
  ],
  twitter: [
    /twitter\.com\/([^\/\?]+)/i,
    /x\.com\/([^\/\?]+)/i,
  ],
  facebook: [
    /facebook\.com\/([^\/\?]+)/i,
    /fb\.com\/([^\/\?]+)/i,
  ],
  linkedin: [
    /linkedin\.com\/company\/([^\/\?]+)/i,
    /linkedin\.com\/in\/([^\/\?]+)/i,
  ],
  tiktok: [
    /tiktok\.com\/@([^\/\?]+)/i,
  ],
  youtube: [
    /youtube\.com\/(@?[^\/\?]+)/i,
    /youtube\.com\/channel\/([^\/\?]+)/i,
  ],
  snapchat: [
    /snapchat\.com\/add\/([^\/\?]+)/i,
  ],
};

// ==================== URL Blacklist ====================
// URLs to ignore when looking for official website
const URL_BLACKLIST = [
  'google.com',
  'google.co',
  'goo.gl',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'tiktok.com',
  'snapchat.com',
  'wikipedia.org',
  'wikidata.org',
  'yelp.com',
  'tripadvisor.com',
  'foursquare.com',
  'yellowpages',
  'whitepages',
];

// ==================== Helper Functions ====================

/**
 * Check if URL is a social media link
 */
function isSocialMediaUrl(url) {
  if (!url) return false;
  const socialDomains = ['instagram.com', 'twitter.com', 'x.com', 'facebook.com', 
                         'linkedin.com', 'tiktok.com', 'youtube.com', 'snapchat.com'];
  return socialDomains.some(domain => url.includes(domain));
}

/**
 * Check if URL should be blacklisted
 */
function isBlacklistedUrl(url) {
  if (!url) return true;
  return URL_BLACKLIST.some(domain => url.includes(domain));
}

/**
 * Extract social media platform from URL
 */
function getSocialMediaPlatform(url) {
  if (!url) return null;
  
  for (const [platform, patterns] of Object.entries(SOCIAL_MEDIA_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform;
      }
    }
  }
  return null;
}

/**
 * Clean and normalize URL
 */
function normalizeUrl(url) {
  if (!url) return null;
  
  try {
    // Remove tracking parameters
    const urlObj = new URL(url);
    
    // Remove common tracking params
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
     'fbclid', 'gclid', 'ref', 'source'].forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.href;
  } catch {
    return url;
  }
}

/**
 * Calculate relevance score for a search result
 */
function calculateRelevanceScore(resultTitle, resultUrl, searchQuery) {
  let score = 0;
  const queryLower = searchQuery.toLowerCase();
  const titleLower = (resultTitle || '').toLowerCase();
  const urlLower = (resultUrl || '').toLowerCase();
  
  // Title contains query
  if (titleLower.includes(queryLower)) score += 30;
  
  // URL contains query words
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  queryWords.forEach(word => {
    if (urlLower.includes(word)) score += 10;
  });
  
  // Is official-looking domain
  if (urlLower.includes('.com') || urlLower.includes('.sa') || 
      urlLower.includes('.ae') || urlLower.includes('.eg')) {
    score += 10;
  }
  
  // Penalize if it's a directory/listing site
  if (urlLower.includes('directory') || urlLower.includes('listing') ||
      urlLower.includes('yellow') || urlLower.includes('pages')) {
    score -= 20;
  }
  
  return score;
}

// ==================== Main Search Function ====================

/**
 * Search Google and extract information
 * @param {Object} params - Search parameters
 * @param {string} params.query - Company name
 * @param {string} params.city - City name
 * @param {number} params.tabId - Tab ID to use for search
 * @returns {Object} - Extracted information
 */
async function searchGoogle({ query, city, tabId }) {
  console.log('[Leedz Google Search] Starting search for:', query, city);
  
  // Build search query
  const searchQuery = city ? `${query} ${city}` : query;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=ar`;
  
  console.log('[Leedz Google Search] URL:', searchUrl);
  
  try {
    // Navigate to search page
    await chrome.tabs.update(tabId, { url: searchUrl });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract results
    const results = await extractGoogleSearchResults(tabId, query);
    
    console.log('[Leedz Google Search] Results:', results);
    return results;
    
  } catch (error) {
    console.error('[Leedz Google Search] Error:', error);
    return {
      officialWebsite: null,
      socialLinks: {},
      additionalInfo: [],
      error: error.message,
    };
  }
}

/**
 * Extract results from Google Search page
 */
async function extractGoogleSearchResults(tabId, searchQuery) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [searchQuery, GOOGLE_SEARCH_SELECTORS, SOCIAL_MEDIA_PATTERNS, URL_BLACKLIST],
      func: (query, SELECTORS, SOCIAL_PATTERNS, BLACKLIST) => {
        console.log('[Leedz Extract] Starting Google Search extraction for:', query);
        
        const extracted = {
          officialWebsite: null,
          socialLinks: {
            instagram: null,
            twitter: null,
            facebook: null,
            linkedin: null,
            tiktok: null,
            youtube: null,
            snapchat: null,
          },
          additionalInfo: [],
          allLinks: [],
        };
        
        // Helper: Find element with multiple selectors
        function findElement(selectors) {
          for (const selector of selectors) {
            try {
              const el = document.querySelector(selector);
              if (el) return el;
            } catch (e) {}
          }
          return null;
        }
        
        // Helper: Find all elements with multiple selectors
        function findAllElements(selectors) {
          const found = new Set();
          const results = [];
          for (const selector of selectors) {
            try {
              document.querySelectorAll(selector).forEach(el => {
                if (!found.has(el)) {
                  found.add(el);
                  results.push(el);
                }
              });
            } catch (e) {}
          }
          return results;
        }
        
        // Helper: Check if URL is blacklisted
        function isBlacklisted(url) {
          if (!url) return true;
          return BLACKLIST.some(domain => url.toLowerCase().includes(domain));
        }
        
        // Helper: Get social platform from URL
        function getSocialPlatform(url) {
          if (!url) return null;
          for (const [platform, patterns] of Object.entries(SOCIAL_PATTERNS)) {
            for (const pattern of patterns) {
              if (pattern.test(url)) return platform;
            }
          }
          return null;
        }
        
        // ==================== Extract from Search Results ====================
        const searchResults = findAllElements(SELECTORS.searchResults);
        console.log('[Leedz Extract] Found', searchResults.length, 'search results');
        
        const candidates = [];
        
        searchResults.forEach((result, index) => {
          // Find link
          const linkEl = result.querySelector('a[href]');
          if (!linkEl) return;
          
          const href = linkEl.href;
          if (!href || href.startsWith('javascript:')) return;
          
          // Find title
          const titleEl = result.querySelector('h3');
          const title = titleEl?.textContent?.trim() || '';
          
          // Find description
          const descEl = result.querySelector('.VwiC3b, .IsZvec');
          const description = descEl?.textContent?.trim() || '';
          
          // Check for social media
          const socialPlatform = getSocialPlatform(href);
          if (socialPlatform && !extracted.socialLinks[socialPlatform]) {
            extracted.socialLinks[socialPlatform] = href;
            console.log('[Leedz Extract] Found social:', socialPlatform, href);
          }
          
          // Check for official website candidate
          if (!isBlacklisted(href) && !socialPlatform) {
            // Calculate relevance
            let score = 100 - (index * 10); // Position bonus
            
            const queryLower = query.toLowerCase();
            const titleLower = title.toLowerCase();
            const hrefLower = href.toLowerCase();
            
            if (titleLower.includes(queryLower)) score += 30;
            if (hrefLower.includes(queryLower.split(' ')[0])) score += 20;
            
            candidates.push({
              url: href,
              title,
              description,
              score,
              position: index,
            });
          }
          
          // Store all links for reference
          extracted.allLinks.push({
            url: href,
            title,
            position: index,
            isSocial: !!socialPlatform,
            socialPlatform,
          });
        });
        
        // Select best official website candidate
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.score - a.score);
          extracted.officialWebsite = candidates[0].url;
          console.log('[Leedz Extract] Best website candidate:', candidates[0]);
        }
        
        // ==================== Extract from Knowledge Panel ====================
        const knowledgePanel = findElement(SELECTORS.knowledgePanel);
        if (knowledgePanel) {
          console.log('[Leedz Extract] Found Knowledge Panel');
          
          // Look for website link
          const websiteLink = knowledgePanel.querySelector('[data-attrid*="website"] a, a[href*="://"]');
          if (websiteLink && !isBlacklisted(websiteLink.href)) {
            // Knowledge Panel website is usually more reliable
            extracted.officialWebsite = websiteLink.href;
            console.log('[Leedz Extract] Website from KP:', websiteLink.href);
          }
          
          // Look for social links in Knowledge Panel
          const kpLinks = knowledgePanel.querySelectorAll('a[href]');
          kpLinks.forEach(link => {
            const href = link.href;
            const platform = getSocialPlatform(href);
            if (platform && !extracted.socialLinks[platform]) {
              extracted.socialLinks[platform] = href;
              console.log('[Leedz Extract] Social from KP:', platform, href);
            }
          });
          
          // Extract additional info
          const infoItems = knowledgePanel.querySelectorAll('[data-attrid]');
          infoItems.forEach(item => {
            const attrid = item.getAttribute('data-attrid');
            const text = item.textContent?.trim();
            if (text && text.length < 200) {
              extracted.additionalInfo.push({
                type: attrid,
                value: text,
              });
            }
          });
        }
        
        // ==================== Clean up results ====================
        // Remove null social links
        Object.keys(extracted.socialLinks).forEach(key => {
          if (!extracted.socialLinks[key]) {
            delete extracted.socialLinks[key];
          }
        });
        
        console.log('[Leedz Extract] Final results:', extracted);
        return extracted;
      },
    });
    
    return results[0]?.result || {
      officialWebsite: null,
      socialLinks: {},
      additionalInfo: [],
    };
    
  } catch (error) {
    console.error('[Leedz Google Search] Extraction error:', error);
    return {
      officialWebsite: null,
      socialLinks: {},
      additionalInfo: [],
      error: error.message,
    };
  }
}

// ==================== Export ====================
// Note: In Chrome Extension context, we'll call these from background.js

console.log('[Leedz Google Search] Module loaded');
