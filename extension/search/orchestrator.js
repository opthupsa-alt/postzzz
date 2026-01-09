/**
 * Leedz Extension - Search Orchestrator
 * منسق البحث الرئيسي - يدير البحث متعدد المصادر
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 * 
 * المسؤوليات:
 * - تنسيق البحث بين Google Maps و Google Search
 * - دمج النتائج من مصادر متعددة
 * - حساب درجة الثقة (Confidence Score)
 * - إزالة التكرارات
 */

// ==================== Configuration ====================
const ORCHESTRATOR_CONFIG = {
  // Enable/disable search layers
  enableGoogleMaps: true,
  enableGoogleSearch: true,
  enableSocialMedia: false, // Phase 4
  
  // When to use Google Search
  googleSearchForSingle: true,   // Use for SINGLE search
  googleSearchForBulk: false,    // Don't use for BULK (too slow)
  googleSearchMinScore: 70,      // Min match score to trigger Google Search
  
  // Enrichment settings
  enrichTopResults: 3,           // Number of top results to enrich in BULK
  enrichmentTimeout: 10000,      // Max time for enrichment per result
  
  // Confidence thresholds
  highConfidence: 80,
  mediumConfidence: 50,
};

// ==================== Data Structures ====================

/**
 * @typedef {Object} SearchResult
 * @property {string} name - Company name
 * @property {string|null} phone - Phone number
 * @property {string|null} website - Website URL
 * @property {string|null} email - Email address
 * @property {string|null} address - Physical address
 * @property {string|null} rating - Rating (e.g., "4.5")
 * @property {string|null} reviews - Number of reviews
 * @property {string|null} type - Business type/category
 * @property {string|null} hours - Working hours
 * @property {Object} links - Social media and other links
 * @property {Object} sources - Data sources used
 * @property {number} confidence - Confidence score (0-100)
 */

/**
 * @typedef {Object} GoogleSearchResult
 * @property {string|null} officialWebsite - Official website URL
 * @property {Object} socialLinks - Social media links
 * @property {Array} additionalInfo - Additional information
 */

// ==================== Merge Functions ====================

/**
 * Merge Google Maps result with Google Search result
 * @param {Object} mapsData - Data from Google Maps
 * @param {GoogleSearchResult} searchData - Data from Google Search
 * @returns {SearchResult} - Merged result
 */
function mergeResults(mapsData, searchData) {
  const merged = {
    ...mapsData,
    
    // Prefer Maps data for basic info, but use Search as fallback
    website: mapsData.website || searchData?.officialWebsite || null,
    
    // Merge links
    links: {
      googleMaps: mapsData.sourceUrl || null,
      website: searchData?.officialWebsite || mapsData.website || null,
      ...(searchData?.socialLinks || {}),
    },
    
    // Track sources
    sources: {
      googleMaps: true,
      googleSearch: !!searchData,
      ...(mapsData.sources || {}),
    },
    
    // Calculate confidence
    confidence: calculateConfidence(mapsData, searchData),
  };
  
  // Clean up null links
  if (merged.links) {
    Object.keys(merged.links).forEach(key => {
      if (!merged.links[key]) delete merged.links[key];
    });
  }
  
  return merged;
}

/**
 * Calculate confidence score based on available data
 * @param {Object} mapsData - Google Maps data
 * @param {Object} searchData - Google Search data
 * @returns {number} - Confidence score (0-100)
 */
function calculateConfidence(mapsData, searchData) {
  let score = 0;
  let factors = 0;
  
  // Name (required)
  if (mapsData.name) {
    score += 20;
    factors++;
  }
  
  // Phone
  if (mapsData.phone) {
    score += 20;
    factors++;
  }
  
  // Website
  if (mapsData.website || searchData?.officialWebsite) {
    score += 15;
    factors++;
    
    // Bonus if both sources agree
    if (mapsData.website && searchData?.officialWebsite) {
      const mapsHost = getHostname(mapsData.website);
      const searchHost = getHostname(searchData.officialWebsite);
      if (mapsHost === searchHost) {
        score += 10; // Agreement bonus
      }
    }
  }
  
  // Address
  if (mapsData.address) {
    score += 15;
    factors++;
  }
  
  // Rating
  if (mapsData.rating) {
    score += 10;
    factors++;
  }
  
  // Social links
  const socialCount = Object.keys(searchData?.socialLinks || {}).length;
  if (socialCount > 0) {
    score += Math.min(socialCount * 5, 15);
    factors++;
  }
  
  // Match score from Maps
  if (mapsData.matchScore >= 90) {
    score += 10;
  } else if (mapsData.matchScore >= 70) {
    score += 5;
  }
  
  // Multiple sources bonus
  if (mapsData.sources?.googleMaps && searchData) {
    score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Extract hostname from URL
 */
function getHostname(url) {
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
  } catch {
    return null;
  }
}

// ==================== Orchestrator Functions ====================

/**
 * Execute enriched search with multiple sources
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query
 * @param {string} params.city - City name
 * @param {string} params.country - Country name
 * @param {string} params.searchType - 'SINGLE' or 'BULK'
 * @param {number} params.maxResults - Max results for BULK
 * @param {Function} params.onProgress - Progress callback
 * @param {Object} context - Execution context (tab, etc.)
 * @returns {Array<SearchResult>} - Search results
 */
async function executeEnrichedSearch(params, context = {}) {
  const { query, city, country, searchType = 'BULK', maxResults = 30, onProgress } = params;
  
  console.log('[Leedz Orchestrator] Starting enriched search');
  console.log('[Leedz Orchestrator] Type:', searchType);
  console.log('[Leedz Orchestrator] Query:', query);
  
  // Layer 1: Google Maps (always)
  if (onProgress) onProgress(20, 'جاري البحث في خرائط جوجل...');
  
  // Note: searchGoogleMaps is defined in background.js
  // This orchestrator will be called from background.js
  const mapsResults = await context.searchGoogleMaps({
    query,
    city,
    country,
    searchType,
    maxResults,
    onProgress: (p, m) => {
      if (onProgress) onProgress(20 + (p * 0.4), m); // 20-60%
    },
  });
  
  console.log('[Leedz Orchestrator] Maps results:', mapsResults.length);
  
  // For SINGLE search with good match, add Google Search
  if (searchType === 'SINGLE' && 
      ORCHESTRATOR_CONFIG.enableGoogleSearch && 
      ORCHESTRATOR_CONFIG.googleSearchForSingle &&
      mapsResults.length > 0) {
    
    const bestMatch = mapsResults[0];
    
    // Only enrich if match score is good enough
    if (bestMatch.matchScore >= ORCHESTRATOR_CONFIG.googleSearchMinScore) {
      if (onProgress) onProgress(65, 'جاري البحث عن معلومات إضافية...');
      
      try {
        // Use the same tab for Google Search
        const searchResults = await context.searchGoogle({
          query: bestMatch.name || query,
          city,
          tabId: context.tabId,
        });
        
        console.log('[Leedz Orchestrator] Google Search results:', searchResults);
        
        // Merge results
        const enrichedResult = mergeResults(bestMatch, searchResults);
        
        if (onProgress) onProgress(85, 'تم دمج النتائج');
        
        return [enrichedResult];
        
      } catch (error) {
        console.error('[Leedz Orchestrator] Google Search failed:', error);
        // Return Maps result without enrichment
        return [mergeResults(bestMatch, null)];
      }
    }
    
    return [mergeResults(bestMatch, null)];
  }
  
  // For BULK search, optionally enrich top results
  if (searchType === 'BULK' && 
      ORCHESTRATOR_CONFIG.enableGoogleSearch &&
      mapsResults.length > 0 && 
      mapsResults.length <= ORCHESTRATOR_CONFIG.enrichTopResults) {
    
    if (onProgress) onProgress(65, 'جاري إثراء النتائج...');
    
    const enrichedResults = [];
    
    for (let i = 0; i < Math.min(mapsResults.length, ORCHESTRATOR_CONFIG.enrichTopResults); i++) {
      const result = mapsResults[i];
      
      // Only enrich if we don't have website
      if (!result.website && result.sourceUrl) {
        try {
          const searchResults = await context.searchGoogle({
            query: result.name,
            city,
            tabId: context.tabId,
          });
          
          enrichedResults.push(mergeResults(result, searchResults));
        } catch {
          enrichedResults.push(mergeResults(result, null));
        }
      } else {
        enrichedResults.push(mergeResults(result, null));
      }
    }
    
    // Add remaining results without enrichment
    for (let i = ORCHESTRATOR_CONFIG.enrichTopResults; i < mapsResults.length; i++) {
      enrichedResults.push(mergeResults(mapsResults[i], null));
    }
    
    return enrichedResults;
  }
  
  // Return Maps results with basic merge
  return mapsResults.map(r => mergeResults(r, null));
}

/**
 * Simple search without enrichment (faster)
 */
async function executeSimpleSearch(params, context = {}) {
  const { query, city, country, searchType = 'BULK', maxResults = 30, onProgress } = params;
  
  console.log('[Leedz Orchestrator] Starting simple search');
  
  const mapsResults = await context.searchGoogleMaps({
    query,
    city,
    country,
    searchType,
    maxResults,
    onProgress,
  });
  
  return mapsResults.map(r => mergeResults(r, null));
}

// ==================== Utility Functions ====================

/**
 * Deduplicate results by name
 */
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(r => {
    const key = (r.name || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Sort results by confidence
 */
function sortByConfidence(results) {
  return [...results].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
}

/**
 * Filter results by minimum confidence
 */
function filterByConfidence(results, minConfidence = 50) {
  return results.filter(r => (r.confidence || 0) >= minConfidence);
}

// ==================== Export ====================

console.log('[Leedz Orchestrator] Module loaded');
