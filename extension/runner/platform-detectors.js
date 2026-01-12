/**
 * Postzzz Extension - Platform Login Detectors
 * Detects if user is logged in to each social platform
 */

// ==================== Platform URLs ====================
const PLATFORM_URLS = {
  X: 'https://x.com',
  INSTAGRAM: 'https://www.instagram.com',
  TIKTOK: 'https://www.tiktok.com',
  LINKEDIN: 'https://www.linkedin.com',
  THREADS: 'https://www.threads.net',
  YOUTUBE: 'https://www.youtube.com',
  FACEBOOK: 'https://www.facebook.com',
  SNAPCHAT: 'https://www.snapchat.com',
};

// ==================== Login Detection Selectors ====================
// These selectors indicate a logged-in state
// Strategy: Use data-testid/aria-label first, then fallback to class selectors
const LOGIN_SELECTORS = {
  X: {
    loggedIn: [
      '[data-testid="SideNav_AccountSwitcher_Button"]',
      '[data-testid="AppTabBar_Home_Link"]',
      'a[href="/compose/tweet"]',
      '[aria-label="Profile"]',
    ],
    loggedOut: [
      '[data-testid="loginButton"]',
      'a[href="/login"]',
      '[data-testid="login"]',
    ],
  },
  INSTAGRAM: {
    loggedIn: [
      'svg[aria-label="Home"]',
      'a[href="/direct/inbox/"]',
      '[aria-label="New post"]',
      'svg[aria-label="الصفحة الرئيسية"]', // Arabic
    ],
    loggedOut: [
      'input[name="username"]',
      'button[type="submit"]',
      '[data-testid="login-button"]',
    ],
  },
  TIKTOK: {
    loggedIn: [
      '[data-e2e="upload-icon"]',
      '[data-e2e="profile-icon"]',
      '[aria-label="Upload video"]',
    ],
    loggedOut: [
      '[data-e2e="top-login-button"]',
      'button[data-e2e="login-button"]',
    ],
  },
  LINKEDIN: {
    // Primary selectors (most reliable)
    loggedIn: [
      '[data-control-name="nav.settings"]',
      '.global-nav__me-photo',
      'button[aria-label="Start a post"]',
      '.share-box-feed-entry__trigger',
      '[data-test-id="nav-settings"]',
      '.feed-identity-module__actor-meta',
    ],
    // Fallback selectors
    loggedInFallback: [
      '.global-nav__me',
      'img.global-nav__me-photo',
      '.feed-shared-actor__meta',
    ],
    loggedOut: [
      '.sign-in-form__sign-in-cta',
      'a[href*="login"]',
      'button[data-id="sign-in-form__submit-btn"]',
      '.authwall-join-form',
    ],
  },
  THREADS: {
    loggedIn: [
      '[aria-label="Create"]',
      '[aria-label="Home"]',
    ],
    loggedOut: [
      'button:has-text("Log in")',
    ],
  },
  YOUTUBE: {
    loggedIn: [
      '#avatar-btn',
      'ytd-topbar-menu-button-renderer',
    ],
    loggedOut: [
      'a[href*="accounts.google.com"]',
      'tp-yt-paper-button#button:has-text("Sign in")',
    ],
  },
  FACEBOOK: {
    loggedIn: [
      '[aria-label="Your profile"]',
      '[aria-label="Create"]',
    ],
    loggedOut: [
      'input[name="email"]',
      'button[name="login"]',
    ],
  },
  SNAPCHAT: {
    loggedIn: [
      '.user-profile',
    ],
    loggedOut: [
      'a[href*="login"]',
    ],
  },
};

// ==================== Detection Functions ====================

/**
 * Check login status for a platform by injecting script into tab
 * Returns detailed result with evidence
 */
async function checkPlatformLogin(platform) {
  const url = PLATFORM_URLS[platform];
  if (!url) {
    return { 
      platform, 
      loggedIn: false, 
      status: 'UNKNOWN', 
      error: 'Unknown platform',
      evidence: null,
      url: null,
    };
  }
  
  try {
    // Find existing tab or create one
    const tabs = await chrome.tabs.query({ url: `${url}/*` });
    let tab = tabs[0];
    let tabCreated = false;
    
    if (!tab) {
      // Open platform in background tab
      tab = await chrome.tabs.create({ url, active: false });
      tabCreated = true;
      // Wait for page to load
      await waitForTabLoad(tab.id, 10000);
    }
    
    // Inject detection script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectLoginStatus,
      args: [LOGIN_SELECTORS[platform]],
    });
    
    const result = results[0]?.result;
    
    if (result?.loggedIn) {
      return { 
        platform, 
        loggedIn: true,
        status: 'LOGGED_IN', 
        tabId: tab.id,
        evidence: result.matchedSelector,
        url: tab.url,
      };
    } else if (result?.loggedOut) {
      return { 
        platform, 
        loggedIn: false,
        status: 'NEEDS_LOGIN', 
        tabId: tab.id,
        evidence: result.matchedSelector,
        url: tab.url,
      };
    } else {
      // Unknown state - log for debugging
      console.warn(`[Postzzz] Unknown login state for ${platform}`, result);
      return { 
        platform, 
        loggedIn: null,
        status: 'UNKNOWN', 
        tabId: tab.id,
        evidence: null,
        url: tab.url,
        debug: result,
      };
    }
  } catch (error) {
    console.error(`[Postzzz] Login check failed for ${platform}:`, error);
    return { 
      platform, 
      loggedIn: null,
      status: 'ERROR', 
      error: error.message,
      evidence: null,
      url: null,
    };
  }
}

/**
 * Function injected into page to detect login status
 * Returns detailed result with matched selector
 */
function detectLoginStatus(selectors) {
  const result = { 
    loggedIn: false, 
    loggedOut: false, 
    matchedSelector: null,
    checkedSelectors: [],
  };
  
  // Check logged-in selectors (primary)
  for (const selector of selectors.loggedIn || []) {
    try {
      result.checkedSelectors.push({ selector, type: 'loggedIn' });
      if (document.querySelector(selector)) {
        result.loggedIn = true;
        result.matchedSelector = selector;
        return result;
      }
    } catch (e) {
      result.checkedSelectors.push({ selector, type: 'loggedIn', error: e.message });
    }
  }
  
  // Check logged-in fallback selectors
  for (const selector of selectors.loggedInFallback || []) {
    try {
      result.checkedSelectors.push({ selector, type: 'loggedInFallback' });
      if (document.querySelector(selector)) {
        result.loggedIn = true;
        result.matchedSelector = selector;
        return result;
      }
    } catch (e) {
      result.checkedSelectors.push({ selector, type: 'loggedInFallback', error: e.message });
    }
  }
  
  // Check logged-out selectors
  for (const selector of selectors.loggedOut || []) {
    try {
      result.checkedSelectors.push({ selector, type: 'loggedOut' });
      if (document.querySelector(selector)) {
        result.loggedOut = true;
        result.matchedSelector = selector;
        return result;
      }
    } catch (e) {
      result.checkedSelectors.push({ selector, type: 'loggedOut', error: e.message });
    }
  }
  
  return result;
}

/**
 * Wait for tab to finish loading
 */
function waitForTabLoad(tabId, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          resolve(tab);
        } else if (Date.now() - startTime > timeout) {
          resolve(tab); // Resolve anyway after timeout
        } else {
          setTimeout(checkTab, 500);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    checkTab();
  });
}

/**
 * Check all platforms login status
 */
async function checkAllPlatformsLogin(platforms = ['X', 'INSTAGRAM', 'LINKEDIN']) {
  const results = {};
  
  for (const platform of platforms) {
    const result = await checkPlatformLogin(platform);
    results[platform] = result.status;
  }
  
  return results;
}

/**
 * Open platform login page
 */
async function openPlatformForLogin(platform) {
  const url = PLATFORM_URLS[platform];
  if (!url) return null;
  
  const tab = await chrome.tabs.create({ url, active: true });
  return tab;
}

// ==================== Export ====================

if (typeof globalThis !== 'undefined') {
  globalThis.PostzzzPlatforms = {
    URLS: PLATFORM_URLS,
    SELECTORS: LOGIN_SELECTORS,
    checkLogin: checkPlatformLogin,
    checkAllLogins: checkAllPlatformsLogin,
    openForLogin: openPlatformForLogin,
    waitForTabLoad,
  };
}
