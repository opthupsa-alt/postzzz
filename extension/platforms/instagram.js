/**
 * Instagram Platform Handler
 * 
 * Complete implementation for Instagram publishing including:
 * - Account verification
 * - Content publishing (images, videos, carousels, reels)
 * - Success detection
 * - Error handling
 * 
 * NOTE: Instagram requires media - cannot post text only
 */

const InstagramHandler = {
  name: 'INSTAGRAM',
  displayName: 'Instagram',
  
  // ==================== CONFIGURATION ====================
  config: {
    urls: ['https://www.instagram.com'],
    composeUrl: 'https://www.instagram.com/',
    profileUrlPattern: /^https?:\/\/(www\.)?instagram\.com\/([^\/\?]+)/,
    
    limits: {
      caption: 2200,
      hashtags: 30,
      images: 10,
      videos: 1,
      reelDuration: 90,
      postVideoDuration: 60,
      videoSize: 650 * 1024 * 1024,
    },
    
    authCookie: 'sessionid',
    cookieDomain: '.instagram.com',
    
    // Instagram requires media
    requiresMedia: true,
  },
  
  // ==================== SELECTORS ====================
  selectors: {
    // Profile elements
    profileLink: [
      'a[href*="/direct/inbox/"]', // Use inbox link to find username
      'span._ap3a._aaco._aacw._aad6._aade', // Username in header
      '[data-testid="user-avatar"]',
    ],
    
    // Create/New post button
    createButton: [
      '[aria-label="New post"]',
      '[aria-label="إنشاء"]',
      '[aria-label="Create"]',
      '[aria-label="Nuevo"]',
      'svg[aria-label="New post"]',
      'a[href="/create/select/"]',
      'a[href="/create/style/"]',
      // Sidebar create button
      'span:contains("Create")',
      'span:contains("إنشاء")',
    ],
    
    // File input (appears after clicking create)
    fileInput: [
      'input[type="file"][accept*="image"]',
      'input[type="file"][accept*="video"]',
      'input[accept="image/jpeg,image/png,image/heic,image/heif,video/mp4,video/quicktime"]',
      'input[type="file"]',
    ],
    
    // Select from computer button
    selectButton: [
      'button:contains("Select from computer")',
      'button:contains("اختر من الكمبيوتر")',
      'button:contains("Seleccionar")',
    ],
    
    // Caption field (appears after selecting media)
    captionField: [
      'textarea[aria-label*="caption"]',
      'textarea[aria-label*="Write a caption"]',
      'textarea[aria-label*="اكتب تعليقاً"]',
      '[contenteditable="true"][role="textbox"]',
      'div[aria-label*="caption"]',
    ],
    
    // Next button (to proceed through steps)
    nextButton: [
      'button:contains("Next")',
      'div[role="button"]:contains("Next")',
      'button:contains("التالي")',
      'div[role="button"]:contains("التالي")',
      '[aria-label="Next"]',
    ],
    
    // Share/Post button
    shareButton: [
      'button:contains("Share")',
      'div[role="button"]:contains("Share")',
      'button:contains("مشاركة")',
      'div[role="button"]:contains("مشاركة")',
      '[aria-label="Share"]',
    ],
    
    // Success indicator
    successIndicator: [
      'span:contains("Your post has been shared")',
      'span:contains("تمت مشاركة منشورك")',
      'img[alt="Animated checkmark"]',
    ],
    
    // Modal/Dialog
    modal: [
      '[role="dialog"]',
      'div[role="dialog"]',
    ],
  },
  
  // ==================== ACCOUNT VERIFICATION ====================
  
  /**
   * Extract username from the current page
   */
  getCurrentUsername: function() {
    // Method 1: From profile link in navigation
    const profileLinks = document.querySelectorAll('a[href^="/"]');
    for (const link of profileLinks) {
      const href = link.getAttribute('href');
      // Look for profile links (not system pages)
      if (href && href.match(/^\/[a-zA-Z0-9._]+\/?$/) && 
          !['/', '/explore/', '/reels/', '/direct/', '/accounts/'].some(p => href.startsWith(p))) {
        const username = href.replace(/\//g, '');
        if (username && username.length > 0) {
          return username;
        }
      }
    }
    
    // Method 2: From settings or profile menu
    const settingsLink = document.querySelector('a[href*="/accounts/edit/"]');
    if (settingsLink) {
      const href = settingsLink.getAttribute('href');
      const match = href.match(/\/([^\/]+)\/accounts/);
      if (match) return match[1];
    }
    
    // Method 3: From page title if on profile
    const title = document.title;
    const titleMatch = title.match(/@([a-zA-Z0-9._]+)/);
    if (titleMatch) return titleMatch[1];
    
    return null;
  },
  
  /**
   * Extract username from profile URL
   */
  extractUsernameFromUrl: function(profileUrl) {
    if (!profileUrl) return null;
    const match = profileUrl.match(this.config.profileUrlPattern);
    return match ? match[2] : null;
  },
  
  /**
   * Verify account matches expected profile
   */
  verifyAccount: function(expectedProfileUrl) {
    const expectedUsername = this.extractUsernameFromUrl(expectedProfileUrl);
    const currentUsername = this.getCurrentUsername();
    
    if (!expectedUsername) {
      return {
        verified: false,
        error: 'Invalid profile URL',
        expectedUsername: null,
        currentUsername,
      };
    }
    
    if (!currentUsername) {
      return {
        verified: false,
        error: 'Could not detect logged-in account',
        expectedUsername,
        currentUsername: null,
      };
    }
    
    const isMatch = expectedUsername.toLowerCase() === currentUsername.toLowerCase();
    
    return {
      verified: isMatch,
      error: isMatch ? null : `Account mismatch: expected @${expectedUsername}, found @${currentUsername}`,
      expectedUsername,
      currentUsername,
    };
  },
  
  // ==================== HELPER FUNCTIONS ====================
  
  findElement: function(selectors) {
    for (const selector of selectors) {
      try {
        // Handle :contains() pseudo-selector
        if (selector.includes(':contains(')) {
          const match = selector.match(/(.+):contains\("(.+)"\)/);
          if (match) {
            const baseSelector = match[1];
            const text = match[2];
            const elements = document.querySelectorAll(baseSelector);
            for (const el of elements) {
              if (el.textContent.includes(text)) return el;
            }
          }
          continue;
        }
        
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return null;
  },
  
  waitForElement: function(selectors, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const check = () => {
        const element = this.findElement(selectors);
        if (element) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(null);
          return;
        }
        
        setTimeout(check, 300);
      };
      
      check();
    });
  },
  
  // ==================== PUBLISHING ====================
  
  /**
   * Click the create button to open composer
   */
  openComposer: async function() {
    // Try clicking create button
    const createBtn = this.findElement(this.selectors.createButton);
    
    if (createBtn) {
      createBtn.click();
      console.log('[Instagram Handler] Clicked create button');
      await new Promise(r => setTimeout(r, 1500));
      return true;
    }
    
    // Try finding create in sidebar by text
    const spans = document.querySelectorAll('span');
    for (const span of spans) {
      if (span.textContent === 'Create' || span.textContent === 'إنشاء') {
        const clickable = span.closest('a') || span.closest('div[role="button"]') || span;
        clickable.click();
        console.log('[Instagram Handler] Clicked create span');
        await new Promise(r => setTimeout(r, 1500));
        return true;
      }
    }
    
    console.error('[Instagram Handler] Create button not found');
    return false;
  },
  
  /**
   * Upload media files
   */
  uploadMedia: async function(files) {
    if (!files || files.length === 0) {
      console.error('[Instagram Handler] No files provided - Instagram requires media');
      return false;
    }
    
    // Wait for file input to appear
    const fileInput = await this.waitForElement(this.selectors.fileInput, 5000);
    
    if (!fileInput) {
      console.error('[Instagram Handler] File input not found');
      return false;
    }
    
    // Create DataTransfer and add files
    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }
    
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('[Instagram Handler] Media upload initiated');
    
    // Wait for processing
    await new Promise(r => setTimeout(r, 3000));
    
    return true;
  },
  
  /**
   * Click Next button to proceed
   */
  clickNext: async function() {
    await new Promise(r => setTimeout(r, 1000));
    
    // Find Next button
    const nextBtn = this.findElement(this.selectors.nextButton);
    
    if (nextBtn) {
      nextBtn.click();
      console.log('[Instagram Handler] Clicked Next');
      await new Promise(r => setTimeout(r, 1500));
      return true;
    }
    
    // Try finding by text
    const buttons = document.querySelectorAll('button, div[role="button"]');
    for (const btn of buttons) {
      if (btn.textContent === 'Next' || btn.textContent === 'التالي') {
        btn.click();
        console.log('[Instagram Handler] Clicked Next (by text)');
        await new Promise(r => setTimeout(r, 1500));
        return true;
      }
    }
    
    console.error('[Instagram Handler] Next button not found');
    return false;
  },
  
  /**
   * Fill caption
   */
  fillCaption: async function(caption) {
    if (!caption) return true;
    
    // Wait for caption field
    const captionField = await this.waitForElement(this.selectors.captionField, 5000);
    
    if (!captionField) {
      console.error('[Instagram Handler] Caption field not found');
      return false;
    }
    
    captionField.focus();
    
    // Fill based on element type
    if (captionField.tagName === 'TEXTAREA') {
      captionField.value = caption;
      captionField.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      document.execCommand('insertText', false, caption);
    }
    
    console.log('[Instagram Handler] Caption filled');
    return true;
  },
  
  /**
   * Click Share button
   */
  clickShare: async function() {
    await new Promise(r => setTimeout(r, 1000));
    
    const shareBtn = this.findElement(this.selectors.shareButton);
    
    if (shareBtn) {
      shareBtn.click();
      console.log('[Instagram Handler] Clicked Share');
      return true;
    }
    
    // Try finding by text
    const buttons = document.querySelectorAll('button, div[role="button"]');
    for (const btn of buttons) {
      if (btn.textContent === 'Share' || btn.textContent === 'مشاركة') {
        btn.click();
        console.log('[Instagram Handler] Clicked Share (by text)');
        return true;
      }
    }
    
    console.error('[Instagram Handler] Share button not found');
    return false;
  },
  
  /**
   * Wait for success
   */
  waitForSuccess: async function(timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check for success indicator
      const success = this.findElement(this.selectors.successIndicator);
      if (success) {
        console.log('[Instagram Handler] Success detected');
        return true;
      }
      
      // Check if modal closed
      const modal = this.findElement(this.selectors.modal);
      if (!modal) {
        console.log('[Instagram Handler] Modal closed - assuming success');
        return true;
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    return false;
  },
  
  /**
   * Complete publishing flow
   */
  publish: async function(options) {
    const { caption, mediaFiles, expectedProfileUrl, autoPost = true } = options;
    
    console.log('[Instagram Handler] Starting publish flow');
    
    // Step 1: Verify account
    if (expectedProfileUrl) {
      const verification = this.verifyAccount(expectedProfileUrl);
      if (!verification.verified) {
        return {
          success: false,
          error: verification.error,
          step: 'account_verification',
        };
      }
      console.log('[Instagram Handler] Account verified:', verification.currentUsername);
    }
    
    // Step 2: Validate - Instagram requires media
    if (!mediaFiles || mediaFiles.length === 0) {
      return {
        success: false,
        error: 'Instagram requires at least one image or video',
        step: 'validation',
      };
    }
    
    // Step 3: Validate caption length
    if (caption && caption.length > this.config.limits.caption) {
      return {
        success: false,
        error: `Caption exceeds limit: ${caption.length}/${this.config.limits.caption}`,
        step: 'validation',
      };
    }
    
    // Step 4: Open composer
    const composerOpened = await this.openComposer();
    if (!composerOpened) {
      return {
        success: false,
        error: 'Failed to open composer',
        step: 'open_composer',
      };
    }
    
    // Step 5: Upload media
    const uploadSuccess = await this.uploadMedia(mediaFiles);
    if (!uploadSuccess) {
      return {
        success: false,
        error: 'Failed to upload media',
        step: 'media_upload',
      };
    }
    
    // Step 6: Click Next (filters/edit step)
    await this.clickNext();
    
    // Step 7: Click Next again (to caption step)
    await this.clickNext();
    
    // Step 8: Fill caption
    if (caption) {
      const captionSuccess = await this.fillCaption(caption);
      if (!captionSuccess) {
        return {
          success: false,
          error: 'Failed to fill caption',
          step: 'caption_fill',
        };
      }
    }
    
    // Step 9: Auto-post if enabled
    if (autoPost) {
      const shareSuccess = await this.clickShare();
      if (!shareSuccess) {
        return {
          success: false,
          error: 'Failed to click share button',
          step: 'share_click',
        };
      }
      
      // Step 10: Wait for success
      const success = await this.waitForSuccess(30000);
      if (!success) {
        return {
          success: false,
          error: 'Could not confirm post success',
          step: 'confirmation',
        };
      }
      
      return {
        success: true,
        message: 'Post shared successfully',
      };
    }
    
    return {
      success: true,
      message: 'Content ready - click Share to post',
      requiresManualPost: true,
    };
  },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InstagramHandler;
}

if (typeof window !== 'undefined') {
  window.InstagramHandler = InstagramHandler;
}
