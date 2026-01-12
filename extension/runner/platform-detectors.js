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
const LOGIN_SELECTORS = {
  X: {
    loggedIn: [
      '[data-testid="SideNav_AccountSwitcher_Button"]',
      '[data-testid="AppTabBar_Home_Link"]',
      'a[href="/compose/tweet"]',
    ],
    loggedOut: [
      '[data-testid="loginButton"]',
      'a[href="/login"]',
    ],
  },
  INSTAGRAM: {
    loggedIn: [
      'svg[aria-label="Home"]',
      'a[href="/direct/inbox/"]',
      '[aria-label="New post"]',
    ],
    loggedOut: [
      'input[name="username"]',
      'button[type="submit"]:has-text("Log in")',
    ],
  },
  TIKTOK: {
    loggedIn: [
      '[data-e2e="upload-icon"]',
      '[data-e2e="profile-icon"]',
    ],
    loggedOut: [
      '[data-e2e="top-login-button"]',
      'button:has-text("Log in")',
    ],
  },
  LINKEDIN: {
    loggedIn: [
      '.global-nav__me',
      '[data-control-name="nav.settings"]',
      '.share-box-feed-entry__trigger',
    ],
    loggedOut: [
      '.sign-in-form__sign-in-cta',
      'a[href*="login"]',
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
 */
async function checkPlatformLogin(platform) {
  const url = PLATFORM_URLS[platform];
  if (!url) {
    return { platform, status: 'UNKNOWN', error: 'Unknown platform' };
  }
  
  try {
    // Find existing tab or create one
    const tabs = await chrome.tabs.query({ url: `${url}/*` });
    let tab = tabs[0];
    
    if (!tab) {
      // Open platform in background tab
      tab = await chrome.tabs.create({ url, active: false });
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
      return { platform, status: 'LOGGED_IN', tabId: tab.id };
    } else if (result?.loggedOut) {
      return { platform, status: 'NEEDS_LOGIN', tabId: tab.id };
    } else {
      return { platform, status: 'UNKNOWN', tabId: tab.id };
    }
  } catch (error) {
    console.error(`[Postzzz] Login check failed for ${platform}:`, error);
    return { platform, status: 'ERROR', error: error.message };
  }
}

/**
 * Function injected into page to detect login status
 */
function detectLoginStatus(selectors) {
  const result = { loggedIn: false, loggedOut: false };
  
  // Check logged-in selectors
  for (const selector of selectors.loggedIn || []) {
    try {
      if (document.querySelector(selector)) {
        result.loggedIn = true;
        break;
      }
    } catch (e) {}
  }
  
  // Check logged-out selectors
  for (const selector of selectors.loggedOut || []) {
    try {
      if (document.querySelector(selector)) {
        result.loggedOut = true;
        break;
      }
    } catch (e) {}
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
