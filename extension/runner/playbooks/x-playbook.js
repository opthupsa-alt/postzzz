/**
 * Postzzz Extension - X (Twitter) Publishing Playbook
 * Assist Mode: Fill composer, wait for user confirmation before publish
 */

const X_PLAYBOOK = {
  platform: 'X',
  url: 'https://x.com',
  composerUrl: 'https://x.com/compose/tweet',
  
  // Selectors
  selectors: {
    // Composer
    composerTextarea: '[data-testid="tweetTextarea_0"]',
    composerButton: '[data-testid="SideNav_NewTweet_Button"]',
    tweetButton: '[data-testid="tweetButton"]',
    tweetButtonDisabled: '[data-testid="tweetButton"][aria-disabled="true"]',
    
    // Media
    mediaInput: 'input[data-testid="fileInput"]',
    mediaButton: '[data-testid="attachments"]',
    
    // Success indicators
    tweetPosted: '[data-testid="toast"]',
    tweetLink: 'a[href*="/status/"]',
    
    // Login check
    loggedIn: '[data-testid="SideNav_AccountSwitcher_Button"]',
    loginButton: '[data-testid="loginButton"]',
  },
  
  // Steps
  steps: [
    { id: 'check_login', name: 'التحقق من تسجيل الدخول' },
    { id: 'open_composer', name: 'فتح نافذة التغريدة' },
    { id: 'fill_content', name: 'كتابة المحتوى' },
    { id: 'upload_media', name: 'رفع الوسائط' },
    { id: 'wait_confirm', name: 'انتظار التأكيد' },
    { id: 'publish', name: 'النشر' },
    { id: 'capture_proof', name: 'التقاط الإثبات' },
  ],
};

/**
 * Execute X publishing playbook
 */
async function executeXPlaybook(tabId, variant, options = {}) {
  const logs = [];
  const log = (step, message, data = {}) => {
    const entry = { step, message, timestamp: Date.now(), ...data };
    logs.push(entry);
    console.log(`[X Playbook] ${step}: ${message}`, data);
  };
  
  try {
    // Step 1: Check login
    log('check_login', 'Checking login status');
    const loginCheck = await executeInTab(tabId, checkXLogin);
    
    if (!loginCheck.loggedIn) {
      log('check_login', 'Not logged in', { status: 'NEEDS_LOGIN' });
      return {
        success: false,
        status: 'NEEDS_LOGIN',
        logs,
        error: 'User not logged in to X',
      };
    }
    log('check_login', 'Logged in', { status: 'OK' });
    
    // Step 2: Open composer
    log('open_composer', 'Opening composer');
    await chrome.tabs.update(tabId, { url: X_PLAYBOOK.composerUrl });
    await waitForSelector(tabId, X_PLAYBOOK.selectors.composerTextarea, 10000);
    log('open_composer', 'Composer opened');
    
    // Step 3: Fill content
    log('fill_content', 'Filling content');
    const content = buildTweetContent(variant);
    await executeInTab(tabId, fillComposer, [content, X_PLAYBOOK.selectors.composerTextarea]);
    log('fill_content', 'Content filled', { length: content.length });
    
    // Step 4: Upload media (if any)
    if (variant.mediaAssetIds && variant.mediaAssetIds.length > 0) {
      log('upload_media', 'Uploading media', { count: variant.mediaAssetIds.length });
      // TODO: Implement media upload
      log('upload_media', 'Media upload skipped (not implemented)');
    }
    
    // Step 5: Wait for confirmation (Assist Mode)
    if (options.assistMode !== false) {
      log('wait_confirm', 'Waiting for user confirmation');
      return {
        success: true,
        status: 'AWAITING_CONFIRM',
        logs,
        tabId,
        message: 'Tweet ready. Click publish when ready.',
      };
    }
    
    // Step 6: Publish (only if not assist mode or confirmed)
    log('publish', 'Publishing tweet');
    await executeInTab(tabId, clickPublish, [X_PLAYBOOK.selectors.tweetButton]);
    
    // Wait for success
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 7: Get published URL
    log('capture_proof', 'Getting published URL');
    const publishedUrl = await executeInTab(tabId, getPublishedUrl);
    
    log('complete', 'Tweet published successfully', { publishedUrl });
    
    return {
      success: true,
      status: 'SUCCEEDED',
      logs,
      publishedUrl,
      tabId,
    };
    
  } catch (error) {
    log('error', error.message, { stack: error.stack });
    return {
      success: false,
      status: 'FAILED',
      logs,
      error: error.message,
    };
  }
}

// ==================== Helper Functions (injected into page) ====================

function checkXLogin() {
  const loggedIn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
  const loginBtn = document.querySelector('[data-testid="loginButton"]');
  return {
    loggedIn: !!loggedIn,
    loggedOut: !!loginBtn,
  };
}

function fillComposer(content, selector) {
  const textarea = document.querySelector(selector);
  if (!textarea) throw new Error('Composer textarea not found');
  
  // Focus and fill
  textarea.focus();
  
  // Use execCommand for better compatibility
  document.execCommand('insertText', false, content);
  
  // Dispatch events
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  
  return true;
}

function clickPublish(selector) {
  const button = document.querySelector(selector);
  if (!button) throw new Error('Publish button not found');
  if (button.getAttribute('aria-disabled') === 'true') {
    throw new Error('Publish button is disabled');
  }
  button.click();
  return true;
}

function getPublishedUrl() {
  // Try to find the tweet link in the page
  const links = document.querySelectorAll('a[href*="/status/"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href && href.includes('/status/')) {
      return `https://x.com${href}`;
    }
  }
  return null;
}

// ==================== Utility Functions ====================

function buildTweetContent(variant) {
  let content = variant.caption || '';
  
  if (variant.hashtags) {
    content += '\n\n' + variant.hashtags;
  }
  
  if (variant.linkUrl) {
    content += '\n\n' + variant.linkUrl;
  }
  
  return content.trim();
}

async function executeInTab(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });
  return results[0]?.result;
}

async function waitForSelector(tabId, selector, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const found = await executeInTab(tabId, (sel) => !!document.querySelector(sel), [selector]);
    if (found) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Timeout waiting for selector: ${selector}`);
}

/**
 * Confirm and publish (called after user confirms in Assist Mode)
 */
async function confirmAndPublish(tabId) {
  const logs = [];
  const log = (step, message) => {
    logs.push({ step, message, timestamp: Date.now() });
  };
  
  try {
    log('publish', 'Publishing tweet after confirmation');
    await executeInTab(tabId, clickPublish, [X_PLAYBOOK.selectors.tweetButton]);
    
    // Wait for success
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get published URL
    const publishedUrl = await executeInTab(tabId, getPublishedUrl);
    
    log('complete', 'Tweet published successfully');
    
    return {
      success: true,
      status: 'SUCCEEDED',
      logs,
      publishedUrl,
    };
  } catch (error) {
    log('error', error.message);
    return {
      success: false,
      status: 'FAILED',
      logs,
      error: error.message,
    };
  }
}

// ==================== Export ====================

if (typeof globalThis !== 'undefined') {
  globalThis.PostzzzXPlaybook = {
    config: X_PLAYBOOK,
    execute: executeXPlaybook,
    confirmAndPublish,
    buildTweetContent,
  };
}
