/**
 * Platform Handlers Loader
 * Loads and manages all platform handlers
 */

// Platform handler registry
const PlatformHandlers = {};

// Load handler scripts dynamically
async function loadPlatformHandlers() {
  const platforms = [
    'x-twitter',
    'instagram', 
    'facebook',
    'linkedin',
    'tiktok',
    'youtube',
    'threads',
    'snapchat'
  ];
  
  for (const platform of platforms) {
    try {
      const url = chrome.runtime.getURL(`platforms/${platform}.js`);
      const response = await fetch(url);
      if (response.ok) {
        const code = await response.text();
        // Execute the code to define the handler
        eval(code);
        console.log(`[Postzzz] Loaded handler: ${platform}`);
      }
    } catch (e) {
      console.error(`[Postzzz] Failed to load handler: ${platform}`, e);
    }
  }
  
  // Map handlers to platform names
  if (typeof XTwitterHandler !== 'undefined') PlatformHandlers.X = XTwitterHandler;
  if (typeof InstagramHandler !== 'undefined') PlatformHandlers.INSTAGRAM = InstagramHandler;
  if (typeof FacebookHandler !== 'undefined') PlatformHandlers.FACEBOOK = FacebookHandler;
  if (typeof LinkedInHandler !== 'undefined') PlatformHandlers.LINKEDIN = LinkedInHandler;
  if (typeof TikTokHandler !== 'undefined') PlatformHandlers.TIKTOK = TikTokHandler;
  if (typeof YouTubeHandler !== 'undefined') PlatformHandlers.YOUTUBE = YouTubeHandler;
  if (typeof ThreadsHandler !== 'undefined') PlatformHandlers.THREADS = ThreadsHandler;
  if (typeof SnapchatHandler !== 'undefined') PlatformHandlers.SNAPCHAT = SnapchatHandler;
  
  console.log('[Postzzz] Platform handlers loaded:', Object.keys(PlatformHandlers));
}

/**
 * Get handler for a specific platform
 */
function getPlatformHandler(platform) {
  return PlatformHandlers[platform] || null;
}

/**
 * Execute platform-specific publishing
 */
async function executePlatformPublish(platform, tabId, options) {
  const handler = getPlatformHandler(platform);
  
  if (!handler) {
    return { success: false, error: `No handler for platform: ${platform}` };
  }
  
  // Execute the handler's publish method in the tab context
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (handlerCode, opts) => {
        // Evaluate handler code
        eval(handlerCode);
        
        // Get the handler based on platform
        let handler;
        if (typeof XTwitterHandler !== 'undefined') handler = XTwitterHandler;
        else if (typeof InstagramHandler !== 'undefined') handler = InstagramHandler;
        else if (typeof FacebookHandler !== 'undefined') handler = FacebookHandler;
        else if (typeof LinkedInHandler !== 'undefined') handler = LinkedInHandler;
        else if (typeof TikTokHandler !== 'undefined') handler = TikTokHandler;
        else if (typeof YouTubeHandler !== 'undefined') handler = YouTubeHandler;
        else if (typeof ThreadsHandler !== 'undefined') handler = ThreadsHandler;
        else if (typeof SnapchatHandler !== 'undefined') handler = SnapchatHandler;
        
        if (!handler) {
          return { success: false, error: 'Handler not found in page context' };
        }
        
        // Execute publish
        return await handler.publish(opts);
      },
      args: [handler.toString(), options],
    });
    
    return result[0]?.result || { success: false, error: 'No result from handler' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify account in tab
 */
async function verifyPlatformAccount(platform, tabId, expectedProfileUrl) {
  const handler = getPlatformHandler(platform);
  
  if (!handler) {
    return { verified: false, error: `No handler for platform: ${platform}` };
  }
  
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (handlerName, profileUrl) => {
        // Get handler from window
        const handlers = {
          X: window.XTwitterHandler,
          INSTAGRAM: window.InstagramHandler,
          FACEBOOK: window.FacebookHandler,
          LINKEDIN: window.LinkedInHandler,
          TIKTOK: window.TikTokHandler,
          YOUTUBE: window.YouTubeHandler,
          THREADS: window.ThreadsHandler,
          SNAPCHAT: window.SnapchatHandler,
        };
        
        const handler = handlers[handlerName];
        if (!handler) {
          return { verified: false, error: 'Handler not available' };
        }
        
        return handler.verifyAccount(profileUrl);
      },
      args: [platform, expectedProfileUrl],
    });
    
    return result[0]?.result || { verified: false, error: 'No result' };
  } catch (error) {
    return { verified: false, error: error.message };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PlatformHandlers,
    loadPlatformHandlers,
    getPlatformHandler,
    executePlatformPublish,
    verifyPlatformAccount,
  };
}
