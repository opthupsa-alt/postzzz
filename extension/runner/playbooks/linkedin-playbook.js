/**
 * Postzzz Extension - LinkedIn Publishing Playbook
 * Assist Mode: Fill composer, wait for user confirmation before publish
 * 
 * States:
 * - INIT
 * - CHECK_LOGIN
 * - OPEN_COMPOSER
 * - FILL_TEXT
 * - ATTACH_MEDIA (optional)
 * - AWAIT_CONFIRM (Assist mode)
 * - CLICK_PUBLISH
 * - CAPTURE_PROOF
 * - COMPLETE_JOB
 */

const LINKEDIN_PLAYBOOK = {
  platform: 'LINKEDIN',
  url: 'https://www.linkedin.com',
  feedUrl: 'https://www.linkedin.com/feed/',
  
  // Selectors - ordered by reliability (data-testid/aria-label first)
  selectors: {
    // Composer trigger
    startPostButton: [
      'button[aria-label="Start a post"]',
      '.share-box-feed-entry__trigger',
      'button.share-box-feed-entry__trigger',
      '[data-control-name="share.share_feed_entry"]',
    ],
    
    // Composer modal
    composerModal: [
      '.share-box--is-open',
      '[role="dialog"][aria-label*="post"]',
      '.share-creation-state__text-editor',
    ],
    
    // Text input
    textEditor: [
      '.ql-editor[data-placeholder]',
      '[role="textbox"][aria-label*="post"]',
      '.share-creation-state__text-editor .ql-editor',
      '[contenteditable="true"][data-placeholder]',
    ],
    
    // Media upload
    mediaInput: [
      'input[type="file"][accept*="image"]',
      '.share-creation-state__media-attachment input[type="file"]',
    ],
    mediaButton: [
      'button[aria-label*="Add a photo"]',
      'button[aria-label*="Add media"]',
      '[data-control-name="share.add_photo"]',
    ],
    
    // Publish button
    publishButton: [
      'button[aria-label="Post"]',
      'button.share-actions__primary-action',
      '[data-control-name="share.post"]',
      'button:has-text("Post")',
    ],
    publishButtonDisabled: [
      'button[aria-label="Post"][disabled]',
      'button.share-actions__primary-action[disabled]',
    ],
    
    // Success indicators
    postSuccess: [
      '.artdeco-toast-item--visible',
      '[data-test-artdeco-toast]',
    ],
    
    // Login check
    loggedIn: [
      '.global-nav__me-photo',
      'button[aria-label="Start a post"]',
      '.feed-identity-module',
    ],
    loggedOut: [
      '.sign-in-form__sign-in-cta',
      '.authwall-join-form',
    ],
  },
  
  // Error codes
  errorCodes: {
    NEEDS_LOGIN: 'NEEDS_LOGIN',
    SELECTOR_NOT_FOUND: 'SELECTOR_NOT_FOUND',
    UPLOAD_FAILED: 'UPLOAD_FAILED',
    RATE_LIMITED: 'RATE_LIMITED',
    UNKNOWN: 'UNKNOWN',
  },
  
  // Steps
  steps: [
    { id: 'INIT', name: 'تهيئة' },
    { id: 'CHECK_LOGIN', name: 'التحقق من تسجيل الدخول' },
    { id: 'OPEN_COMPOSER', name: 'فتح نافذة النشر' },
    { id: 'FILL_TEXT', name: 'كتابة المحتوى' },
    { id: 'ATTACH_MEDIA', name: 'إرفاق الوسائط' },
    { id: 'AWAIT_CONFIRM', name: 'انتظار التأكيد' },
    { id: 'CLICK_PUBLISH', name: 'النشر' },
    { id: 'CAPTURE_PROOF', name: 'التقاط الإثبات' },
    { id: 'COMPLETE_JOB', name: 'إكمال المهمة' },
  ],
};

/**
 * Execute LinkedIn publishing playbook
 */
async function executeLinkedInPlaybook(tabId, variant, options = {}) {
  const logs = [];
  let currentState = 'INIT';
  
  const log = (action, details = {}) => {
    const entry = { 
      ts: Date.now(), 
      level: details.error ? 'ERROR' : 'INFO',
      state: currentState,
      action, 
      details,
    };
    logs.push(entry);
    console.log(`[LinkedIn Playbook] ${currentState}: ${action}`, details);
  };
  
  const setState = (newState) => {
    log('state_change', { from: currentState, to: newState });
    currentState = newState;
  };
  
  const findSelector = async (tabId, selectorList, description) => {
    for (const selector of selectorList) {
      try {
        const found = await executeInTab(tabId, (sel) => !!document.querySelector(sel), [selector]);
        if (found) {
          log('selector_found', { description, selector });
          return selector;
        }
      } catch (e) {}
    }
    log('selector_not_found', { description, tried: selectorList });
    return null;
  };
  
  try {
    // INIT
    log('playbook_start', { platform: 'LINKEDIN', variant: variant.id });
    
    // CHECK_LOGIN
    setState('CHECK_LOGIN');
    log('checking_login');
    
    const loginSelector = await findSelector(tabId, LINKEDIN_PLAYBOOK.selectors.loggedIn, 'logged_in');
    if (!loginSelector) {
      const logoutSelector = await findSelector(tabId, LINKEDIN_PLAYBOOK.selectors.loggedOut, 'logged_out');
      if (logoutSelector) {
        log('needs_login', { evidence: logoutSelector });
        return {
          success: false,
          status: 'NEEDS_LOGIN',
          errorCode: LINKEDIN_PLAYBOOK.errorCodes.NEEDS_LOGIN,
          logs,
          error: 'User not logged in to LinkedIn',
        };
      }
    }
    log('login_verified', { evidence: loginSelector });
    
    // OPEN_COMPOSER
    setState('OPEN_COMPOSER');
    
    // Navigate to feed if not there
    const currentUrl = await executeInTab(tabId, () => window.location.href);
    if (!currentUrl.includes('linkedin.com/feed')) {
      log('navigating_to_feed');
      await chrome.tabs.update(tabId, { url: LINKEDIN_PLAYBOOK.feedUrl });
      await waitForPageLoad(tabId, 10000);
    }
    
    // Click "Start a post" button
    const startPostSelector = await findSelector(tabId, LINKEDIN_PLAYBOOK.selectors.startPostButton, 'start_post');
    if (!startPostSelector) {
      return {
        success: false,
        status: 'FAILED',
        errorCode: LINKEDIN_PLAYBOOK.errorCodes.SELECTOR_NOT_FOUND,
        logs,
        error: 'Could not find "Start a post" button',
      };
    }
    
    await executeInTab(tabId, (sel) => {
      const btn = document.querySelector(sel);
      if (btn) btn.click();
    }, [startPostSelector]);
    log('clicked_start_post');
    
    // Wait for composer modal
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const composerSelector = await findSelector(tabId, LINKEDIN_PLAYBOOK.selectors.composerModal, 'composer_modal');
    if (!composerSelector) {
      return {
        success: false,
        status: 'FAILED',
        errorCode: LINKEDIN_PLAYBOOK.errorCodes.SELECTOR_NOT_FOUND,
        logs,
        error: 'Composer modal did not open',
      };
    }
    log('composer_opened');
    
    // FILL_TEXT
    setState('FILL_TEXT');
    
    const content = buildLinkedInContent(variant);
    const textEditorSelector = await findSelector(tabId, LINKEDIN_PLAYBOOK.selectors.textEditor, 'text_editor');
    
    if (!textEditorSelector) {
      return {
        success: false,
        status: 'FAILED',
        errorCode: LINKEDIN_PLAYBOOK.errorCodes.SELECTOR_NOT_FOUND,
        logs,
        error: 'Could not find text editor',
      };
    }
    
    await executeInTab(tabId, fillLinkedInEditor, [textEditorSelector, content]);
    log('content_filled', { length: content.length });
    
    // ATTACH_MEDIA (optional - skip for now)
    setState('ATTACH_MEDIA');
    if (variant.mediaAssetIds && variant.mediaAssetIds.length > 0) {
      log('media_skipped', { reason: 'Not implemented yet' });
    }
    
    // AWAIT_CONFIRM (Assist Mode)
    if (options.assistMode !== false) {
      setState('AWAIT_CONFIRM');
      log('awaiting_confirmation');
      
      return {
        success: true,
        status: 'AWAITING_CONFIRM',
        logs,
        tabId,
        message: 'LinkedIn post ready. Click publish when ready.',
      };
    }
    
    // CLICK_PUBLISH
    setState('CLICK_PUBLISH');
    await clickLinkedInPublish(tabId, logs, log);
    
    // CAPTURE_PROOF
    setState('CAPTURE_PROOF');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // COMPLETE_JOB
    setState('COMPLETE_JOB');
    log('playbook_complete', { status: 'SUCCEEDED' });
    
    return {
      success: true,
      status: 'SUCCEEDED',
      logs,
      tabId,
      publishedUrl: null, // LinkedIn doesn't easily expose post URL
    };
    
  } catch (error) {
    log('playbook_error', { error: error.message, stack: error.stack });
    return {
      success: false,
      status: 'FAILED',
      errorCode: LINKEDIN_PLAYBOOK.errorCodes.UNKNOWN,
      logs,
      error: error.message,
    };
  }
}

// ==================== Helper Functions ====================

function buildLinkedInContent(variant) {
  let content = variant.caption || '';
  
  if (variant.hashtags) {
    content += '\n\n' + variant.hashtags;
  }
  
  if (variant.linkUrl) {
    content += '\n\n' + variant.linkUrl;
  }
  
  return content.trim();
}

/**
 * Fill LinkedIn's Quill-based editor
 */
function fillLinkedInEditor(selector, content) {
  const editor = document.querySelector(selector);
  if (!editor) throw new Error('Editor not found');
  
  // Focus the editor
  editor.focus();
  
  // Clear existing content
  editor.innerHTML = '';
  
  // Insert content as paragraph
  const p = document.createElement('p');
  p.textContent = content;
  editor.appendChild(p);
  
  // Dispatch input event
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Also try execCommand for better compatibility
  try {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, content);
  } catch (e) {}
  
  return true;
}

async function clickLinkedInPublish(tabId, logs, log) {
  const publishSelector = await findSelectorInTab(tabId, LINKEDIN_PLAYBOOK.selectors.publishButton);
  
  if (!publishSelector) {
    throw new Error('Publish button not found');
  }
  
  // Check if disabled
  const isDisabled = await executeInTab(tabId, (sel) => {
    const btn = document.querySelector(sel);
    return btn?.disabled || btn?.getAttribute('aria-disabled') === 'true';
  }, [publishSelector]);
  
  if (isDisabled) {
    throw new Error('Publish button is disabled');
  }
  
  await executeInTab(tabId, (sel) => {
    const btn = document.querySelector(sel);
    if (btn) btn.click();
  }, [publishSelector]);
  
  log('clicked_publish');
  return true;
}

async function findSelectorInTab(tabId, selectorList) {
  for (const selector of selectorList) {
    try {
      const found = await executeInTab(tabId, (sel) => !!document.querySelector(sel), [selector]);
      if (found) return selector;
    } catch (e) {}
  }
  return null;
}

async function executeInTab(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });
  return results[0]?.result;
}

async function waitForPageLoad(tabId, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete') return true;
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

/**
 * Confirm and publish (called after user confirms in Assist Mode)
 */
async function confirmLinkedInPublish(tabId) {
  const logs = [];
  const log = (action, details = {}) => {
    logs.push({ ts: Date.now(), action, details });
    console.log(`[LinkedIn Playbook] Confirm: ${action}`, details);
  };
  
  try {
    log('confirm_publish_start');
    
    await clickLinkedInPublish(tabId, logs, log);
    
    // Wait for success
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    log('publish_complete');
    
    return {
      success: true,
      status: 'SUCCEEDED',
      logs,
      publishedUrl: null,
    };
  } catch (error) {
    log('publish_error', { error: error.message });
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
  globalThis.PostzzzLinkedInPlaybook = {
    config: LINKEDIN_PLAYBOOK,
    execute: executeLinkedInPlaybook,
    confirmAndPublish: confirmLinkedInPublish,
    buildContent: buildLinkedInContent,
  };
}
