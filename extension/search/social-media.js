/**
 * Leedz Extension - Social Media Search Orchestrator
 * منسق البحث في منصات التواصل الاجتماعي
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 */

// ==================== Configuration ====================
const SOCIAL_PLATFORMS = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    searchUrl: (query) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`,
    profileUrl: (username) => `https://www.instagram.com/${username}/`,
    enabled: true,
    priority: 1,
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    searchUrl: (query) => `https://x.com/search?q=${encodeURIComponent(query)}&f=user`,
    profileUrl: (username) => `https://x.com/${username}`,
    enabled: true,
    priority: 2,
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    searchUrl: (query) => `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(query)}`,
    profileUrl: (id) => `https://www.linkedin.com/company/${id}/`,
    enabled: true,
    priority: 3,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    searchUrl: (query) => `https://www.facebook.com/search/pages?q=${encodeURIComponent(query)}`,
    profileUrl: (id) => `https://www.facebook.com/${id}/`,
    enabled: true,
    priority: 4,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    searchUrl: (query) => `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`,
    profileUrl: (username) => `https://www.tiktok.com/@${username}`,
    enabled: true,
    priority: 5,
  },
  snapchat: {
    id: 'snapchat',
    name: 'Snapchat',
    searchUrl: (query) => `https://www.snapchat.com/explore/${encodeURIComponent(query)}`,
    profileUrl: (username) => `https://www.snapchat.com/add/${username}`,
    enabled: false, // Lower priority
    priority: 6,
  },
};

// Timing configuration
const TIMING = {
  PAGE_LOAD_WAIT: 3000,
  BETWEEN_PLATFORMS: 2000,
  EXTRACTION_WAIT: 1500,
};

// ==================== Helper Functions ====================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateMatchScore(name, searchName) {
  if (!name || !searchName) return 0;
  
  const normalizedName = name.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').trim();
  const normalizedSearch = searchName.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').trim();
  
  // Exact match
  if (normalizedName === normalizedSearch) return 100;
  
  // Contains match
  if (normalizedName.includes(normalizedSearch)) return 85;
  if (normalizedSearch.includes(normalizedName)) return 80;
  
  // Word-based matching
  const nameWords = normalizedName.split(/\s+/).filter(w => w.length > 1);
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 1);
  
  if (nameWords.length === 0 || searchWords.length === 0) return 30;
  
  let matchingWords = 0;
  for (const sw of searchWords) {
    for (const nw of nameWords) {
      if (nw === sw || nw.includes(sw) || sw.includes(nw)) {
        matchingWords++;
        break;
      }
    }
  }
  
  return Math.max(30, Math.round((matchingWords / searchWords.length) * 70));
}

// ==================== Platform Extractors ====================

/**
 * Search Instagram for business accounts
 */
async function searchInstagram(tabId, companyName, city) {
  console.log('[Leedz Social] Searching Instagram for:', companyName);
  
  const query = city ? `${companyName} ${city}` : companyName;
  const searchUrl = SOCIAL_PLATFORMS.instagram.searchUrl(query);
  
  try {
    await chrome.tabs.update(tabId, { url: searchUrl });
    await delay(TIMING.PAGE_LOAD_WAIT);
    
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [companyName],
      func: (searchName) => {
        const accounts = [];
        
        // Instagram search results selectors
        const selectors = [
          '[role="button"]',
          'a[href*="/"]',
          '[class*="search"]',
        ];
        
        // Try to find account items
        const items = document.querySelectorAll('a[href^="/"][href$="/"]');
        
        items.forEach(item => {
          const href = item.getAttribute('href');
          if (href && href.length > 2 && href.length < 50 && !href.includes('/explore/')) {
            const username = href.replace(/\//g, '');
            const displayName = item.textContent?.trim() || username;
            
            if (username && username.length > 1) {
              accounts.push({
                platform: 'instagram',
                username,
                displayName,
                url: `https://www.instagram.com/${username}/`,
              });
            }
          }
        });
        
        // Remove duplicates
        const seen = new Set();
        return accounts.filter(a => {
          if (seen.has(a.username)) return false;
          seen.add(a.username);
          return true;
        }).slice(0, 10);
      },
    });
    
    const accounts = results[0]?.result || [];
    
    // Calculate match scores
    return accounts.map(a => ({
      ...a,
      matchScore: calculateMatchScore(a.displayName || a.username, companyName),
    })).sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('[Leedz Social] Instagram search error:', error);
    return [];
  }
}

/**
 * Search Twitter/X for business accounts
 */
async function searchTwitter(tabId, companyName, city) {
  console.log('[Leedz Social] Searching Twitter for:', companyName);
  
  const query = city ? `${companyName} ${city}` : companyName;
  const searchUrl = SOCIAL_PLATFORMS.twitter.searchUrl(query);
  
  try {
    await chrome.tabs.update(tabId, { url: searchUrl });
    await delay(TIMING.PAGE_LOAD_WAIT + 1000); // Twitter needs more time
    
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [companyName],
      func: (searchName) => {
        const accounts = [];
        
        // Twitter user cell selectors
        const userCells = document.querySelectorAll('[data-testid="UserCell"]');
        
        userCells.forEach(cell => {
          try {
            const displayNameEl = cell.querySelector('[dir="ltr"] > span > span');
            const usernameEl = cell.querySelector('[dir="ltr"]:nth-of-type(2) span');
            const bioEl = cell.querySelector('[data-testid="UserDescription"]');
            const linkEl = cell.querySelector('a[href*="/"]');
            
            const displayName = displayNameEl?.textContent?.trim();
            let username = usernameEl?.textContent?.trim() || '';
            username = username.replace('@', '');
            
            if (!username && linkEl) {
              const href = linkEl.getAttribute('href');
              if (href) username = href.replace('/', '');
            }
            
            if (username) {
              accounts.push({
                platform: 'twitter',
                username,
                displayName: displayName || username,
                bio: bioEl?.textContent?.trim() || null,
                url: `https://x.com/${username}`,
              });
            }
          } catch (e) {}
        });
        
        // Remove duplicates
        const seen = new Set();
        return accounts.filter(a => {
          if (seen.has(a.username)) return false;
          seen.add(a.username);
          return true;
        }).slice(0, 10);
      },
    });
    
    const accounts = results[0]?.result || [];
    
    return accounts.map(a => ({
      ...a,
      matchScore: calculateMatchScore(a.displayName || a.username, companyName),
    })).sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('[Leedz Social] Twitter search error:', error);
    return [];
  }
}

/**
 * Search LinkedIn for company pages
 */
async function searchLinkedIn(tabId, companyName, city) {
  console.log('[Leedz Social] Searching LinkedIn for:', companyName);
  
  const query = city ? `${companyName} ${city}` : companyName;
  const searchUrl = SOCIAL_PLATFORMS.linkedin.searchUrl(query);
  
  try {
    await chrome.tabs.update(tabId, { url: searchUrl });
    await delay(TIMING.PAGE_LOAD_WAIT + 1000);
    
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [companyName],
      func: (searchName) => {
        const companies = [];
        
        // LinkedIn company card selectors
        const companyCards = document.querySelectorAll('.entity-result, .search-result__wrapper');
        
        companyCards.forEach(card => {
          try {
            const nameEl = card.querySelector('.entity-result__title-text a, .search-result__title a');
            const linkEl = card.querySelector('a.app-aware-link, a[href*="/company/"]');
            const industryEl = card.querySelector('.entity-result__primary-subtitle, .search-result__subtitle');
            const locationEl = card.querySelector('.entity-result__secondary-subtitle');
            
            const name = nameEl?.textContent?.trim();
            const link = linkEl?.href;
            
            if (name && link && link.includes('/company/')) {
              companies.push({
                platform: 'linkedin',
                name,
                url: link,
                industry: industryEl?.textContent?.trim() || null,
                location: locationEl?.textContent?.trim() || null,
              });
            }
          } catch (e) {}
        });
        
        // Remove duplicates
        const seen = new Set();
        return companies.filter(c => {
          if (seen.has(c.url)) return false;
          seen.add(c.url);
          return true;
        }).slice(0, 10);
      },
    });
    
    const companies = results[0]?.result || [];
    
    return companies.map(c => ({
      ...c,
      matchScore: calculateMatchScore(c.name, companyName),
    })).sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('[Leedz Social] LinkedIn search error:', error);
    return [];
  }
}

/**
 * Search Facebook for business pages
 */
async function searchFacebook(tabId, companyName, city) {
  console.log('[Leedz Social] Searching Facebook for:', companyName);
  
  const query = city ? `${companyName} ${city}` : companyName;
  const searchUrl = SOCIAL_PLATFORMS.facebook.searchUrl(query);
  
  try {
    await chrome.tabs.update(tabId, { url: searchUrl });
    await delay(TIMING.PAGE_LOAD_WAIT + 1000);
    
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [companyName],
      func: (searchName) => {
        const pages = [];
        
        // Facebook page result selectors
        const pageResults = document.querySelectorAll('[role="article"], [data-pagelet*="SearchResults"] > div');
        
        pageResults.forEach(result => {
          try {
            const nameEl = result.querySelector('span[dir="auto"] > span, a[role="link"] span');
            const linkEl = result.querySelector('a[href*="facebook.com/"]');
            const categoryEl = result.querySelector('[role="button"] span');
            
            const name = nameEl?.textContent?.trim();
            let link = linkEl?.href;
            
            // Clean up Facebook URL
            if (link) {
              try {
                const url = new URL(link);
                link = url.origin + url.pathname;
              } catch {}
            }
            
            if (name && link && link.includes('facebook.com') && !link.includes('/search/')) {
              pages.push({
                platform: 'facebook',
                name,
                url: link,
                category: categoryEl?.textContent?.trim() || null,
              });
            }
          } catch (e) {}
        });
        
        // Remove duplicates
        const seen = new Set();
        return pages.filter(p => {
          if (seen.has(p.url)) return false;
          seen.add(p.url);
          return true;
        }).slice(0, 10);
      },
    });
    
    const pages = results[0]?.result || [];
    
    return pages.map(p => ({
      ...p,
      matchScore: calculateMatchScore(p.name, companyName),
    })).sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('[Leedz Social] Facebook search error:', error);
    return [];
  }
}

/**
 * Search TikTok for business accounts
 */
async function searchTikTok(tabId, companyName, city) {
  console.log('[Leedz Social] Searching TikTok for:', companyName);
  
  const searchUrl = SOCIAL_PLATFORMS.tiktok.searchUrl(companyName);
  
  try {
    await chrome.tabs.update(tabId, { url: searchUrl });
    await delay(TIMING.PAGE_LOAD_WAIT + 2000); // TikTok needs more time
    
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [companyName],
      func: (searchName) => {
        const accounts = [];
        
        // TikTok user card selectors
        const userCards = document.querySelectorAll('[data-e2e="search-user-card"], [class*="UserCard"]');
        
        userCards.forEach(card => {
          try {
            const usernameEl = card.querySelector('[data-e2e="search-user-unique-id"], [class*="uniqueId"]');
            const displayNameEl = card.querySelector('[data-e2e="search-user-nickname"], [class*="nickname"]');
            const linkEl = card.querySelector('a[href*="/@"]');
            
            const username = usernameEl?.textContent?.trim();
            const displayName = displayNameEl?.textContent?.trim();
            const link = linkEl?.href;
            
            if (username || link) {
              accounts.push({
                platform: 'tiktok',
                username: username || link?.split('@')[1]?.split('?')[0],
                displayName: displayName || username,
                url: link || `https://www.tiktok.com/@${username}`,
              });
            }
          } catch (e) {}
        });
        
        // Remove duplicates
        const seen = new Set();
        return accounts.filter(a => {
          if (seen.has(a.username)) return false;
          seen.add(a.username);
          return true;
        }).slice(0, 10);
      },
    });
    
    const accounts = results[0]?.result || [];
    
    return accounts.map(a => ({
      ...a,
      matchScore: calculateMatchScore(a.displayName || a.username, companyName),
    })).sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('[Leedz Social] TikTok search error:', error);
    return [];
  }
}

// ==================== Main Search Function ====================

/**
 * Search all enabled social media platforms
 * @param {Object} params - Search parameters
 * @param {string} params.companyName - Company name to search
 * @param {string} params.city - City name
 * @param {string[]} params.enabledPlatforms - List of enabled platform IDs
 * @param {number} params.tabId - Tab ID to use for searching
 * @param {Function} params.onProgress - Progress callback
 * @returns {Object} - Results from each platform
 */
async function searchSocialMedia({ companyName, city, enabledPlatforms, tabId, onProgress }) {
  console.log('[Leedz Social] Starting social media search');
  console.log('[Leedz Social] Company:', companyName);
  console.log('[Leedz Social] Enabled platforms:', enabledPlatforms);
  
  const results = {};
  const extractors = {
    instagram: searchInstagram,
    twitter: searchTwitter,
    linkedin: searchLinkedIn,
    facebook: searchFacebook,
    tiktok: searchTikTok,
  };
  
  // Sort platforms by priority
  const sortedPlatforms = enabledPlatforms
    .filter(p => extractors[p])
    .sort((a, b) => (SOCIAL_PLATFORMS[a]?.priority || 99) - (SOCIAL_PLATFORMS[b]?.priority || 99));
  
  let completed = 0;
  const total = sortedPlatforms.length;
  
  for (const platform of sortedPlatforms) {
    try {
      if (onProgress) {
        onProgress(Math.round((completed / total) * 100), `جاري البحث في ${SOCIAL_PLATFORMS[platform]?.name || platform}...`);
      }
      
      const platformResults = await extractors[platform](tabId, companyName, city);
      
      if (platformResults.length > 0) {
        // Take the best match
        results[platform] = platformResults[0];
        console.log(`[Leedz Social] Found on ${platform}:`, platformResults[0]);
      }
      
      completed++;
      
      // Delay between platforms to avoid rate limiting
      if (completed < total) {
        await delay(TIMING.BETWEEN_PLATFORMS);
      }
      
    } catch (error) {
      console.error(`[Leedz Social] Error searching ${platform}:`, error);
      completed++;
    }
  }
  
  if (onProgress) {
    onProgress(100, 'اكتمل البحث في منصات التواصل');
  }
  
  console.log('[Leedz Social] Search complete. Results:', results);
  return results;
}

/**
 * Get connected platforms from storage
 */
async function getConnectedPlatforms() {
  try {
    const data = await chrome.storage.local.get('leedz_social_platforms');
    const states = data.leedz_social_platforms || {};
    
    return Object.entries(states)
      .filter(([_, state]) => state.connected)
      .map(([platform]) => platform);
  } catch (error) {
    console.error('[Leedz Social] Error getting connected platforms:', error);
    return [];
  }
}

console.log('[Leedz Social Media] Module loaded');
