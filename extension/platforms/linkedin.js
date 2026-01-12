/**
 * LinkedIn Platform Handler
 * 
 * Complete implementation for LinkedIn publishing including:
 * - Account verification
 * - Content publishing (text, images, videos, documents)
 * - Success detection
 * - Error handling
 */

const LinkedInHandler = {
  name: 'LINKEDIN',
  displayName: 'LinkedIn',
  
  // ==================== CONFIGURATION ====================
  config: {
    urls: ['https://www.linkedin.com'],
    composeUrl: 'https://www.linkedin.com/feed/',
    profileUrlPattern: /^https?:\/\/(www\.)?linkedin\.com\/in\/([^\/\?]+)/,
    
    limits: {
      text: 3000,
      images: 9,
      videos: 1,
      videoDuration: 600, // 10 minutes
      videoSize: 5 * 1024 * 1024 * 1024, // 5GB
    },
    
    authCookie: 'li_at',
    cookieDomain: '.linkedin.com',
  },
  
  // ==================== SELECTORS ====================
  selectors: {
    // Profile elements
    profileLink: [
      '.feed-identity-module__actor-meta a',
      'a[href*="/in/"]',
      '.global-nav__me-photo',
    ],
    
    profileName: [
      '.feed-identity-module__actor-meta',
      '.artdeco-entity-lockup__title',
    ],
    
    // Start post button
    startPostButton: [
      '.share-box-feed-entry__trigger',
      '[data-control-name="share.post_entry_point"]',
      'button[aria-label*="Start a post"]',
      'button[aria-label*="ابدأ منشوراً"]',
      '.share-box-feed-entry__top-bar button',
    ],
    
    // Editor (in modal)
    editor: [
      '.ql-editor',
      '[role="textbox"][contenteditable="true"]',
      '[data-placeholder*="What do you want to talk about"]',
      '[data-placeholder*="ما الذي تريد التحدث عنه"]',
      '.editor-content [contenteditable="true"]',
    ],
    
    // Post button
    postButton: [
      '.share-actions__primary-action',
      'button.share-box-footer__primary-btn',
      'button[aria-label*="Post"]',
      'button[aria-label*="نشر"]',
      'button.artdeco-button--primary',
    ],
    
    // Media buttons
    addPhotoButton: [
      'button[aria-label*="Add a photo"]',
      'button[aria-label*="إضافة صورة"]',
      '[data-control-name="share.addPhoto"]',
    ],
    
    addVideoButton: [
      'button[aria-label*="Add a video"]',
      'button[aria-label*="إضافة فيديو"]',
      '[data-control-name="share.addVideo"]',
    ],
    
    // File input
    fileInput: [
      'input[type="file"]',
      'input[accept*="image"]',
      'input[accept*="video"]',
    ],
    
    // Modal
    modal: [
      '.share-box-modal',
      '[role="dialog"]',
      '.artdeco-modal',
    ],
    
    // Success indicator
    successToast: [
      '.artdeco-toast-item',
      '[role="alert"]',
    ],
  },
  
  // ==================== ACCOUNT VERIFICATION ====================
  
  getCurrentUsername: function() {
    // Method 1: From profile link
    const profileLinks = document.querySelectorAll('a[href*="/in/"]');
    for (const link of profileLinks) {
      const href = link.getAttribute('href');
      const match = href.match(/\/in\/([^\/\?]+)/);
      if (match) {
        return match[1];
      }
    }
    
    // Method 2: From feed identity module
    const identityLink = document.querySelector('.feed-identity-module a[href*="/in/"]');
    if (identityLink) {
      const match = identityLink.href.match(/\/in\/([^\/\?]+)/);
      if (match) return match[1];
    }
    
    return null;
  },
  
  extractUsernameFromUrl: function(profileUrl) {
    if (!profileUrl) return null;
    const match = profileUrl.match(this.config.profileUrlPattern);
    return match ? match[2] : null;
  },
  
  verifyAccount: function(expectedProfileUrl) {
    const expectedUsername = this.extractUsernameFromUrl(expectedProfileUrl);
    const currentUsername = this.getCurrentUsername();
    
    if (!expectedUsername) {
      return { verified: false, error: 'Invalid profile URL', expectedUsername: null, currentUsername };
    }
    
    if (!currentUsername) {
      return { verified: false, error: 'Could not detect logged-in account', expectedUsername, currentUsername: null };
    }
    
    const isMatch = expectedUsername.toLowerCase() === currentUsername.toLowerCase();
    
    return {
      verified: isMatch,
      error: isMatch ? null : `Account mismatch: expected ${expectedUsername}, found ${currentUsername}`,
      expectedUsername,
      currentUsername,
    };
  },
  
  // ==================== HELPER FUNCTIONS ====================
  
  findElement: function(selectors) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {}
    }
    return null;
  },
  
  waitForElement: function(selectors, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const check = () => {
        const element = this.findElement(selectors);
        if (element) { resolve(element); return; }
        if (Date.now() - startTime > timeout) { resolve(null); return; }
        setTimeout(check, 300);
      };
      check();
    });
  },
  
  // ==================== PUBLISHING ====================
  
  openComposer: async function() {
    const startBtn = this.findElement(this.selectors.startPostButton);
    
    if (startBtn) {
      startBtn.click();
      console.log('[LinkedIn Handler] Clicked start post button');
      await new Promise(r => setTimeout(r, 1500));
      return true;
    }
    
    console.error('[LinkedIn Handler] Start post button not found');
    return false;
  },
  
  fillText: async function(text) {
    const editor = await this.waitForElement(this.selectors.editor, 5000);
    
    if (!editor) {
      console.error('[LinkedIn Handler] Editor not found');
      return false;
    }
    
    editor.focus();
    
    // LinkedIn uses Quill editor
    if (editor.classList.contains('ql-editor')) {
      editor.innerHTML = `<p>${text}</p>`;
    } else {
      document.execCommand('insertText', false, text);
    }
    
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('[LinkedIn Handler] Text filled');
    return true;
  },
  
  uploadMedia: async function(files) {
    if (!files || files.length === 0) return true;
    
    // Click add photo/video button first
    const isVideo = files[0].type.startsWith('video/');
    const mediaBtn = this.findElement(isVideo ? this.selectors.addVideoButton : this.selectors.addPhotoButton);
    
    if (mediaBtn) {
      mediaBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Find file input
    const fileInput = await this.waitForElement(this.selectors.fileInput, 3000);
    
    if (!fileInput) {
      console.error('[LinkedIn Handler] File input not found');
      return false;
    }
    
    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }
    
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('[LinkedIn Handler] Media upload initiated');
    await new Promise(r => setTimeout(r, 2000));
    
    return true;
  },
  
  clickPost: async function() {
    await new Promise(r => setTimeout(r, 1000));
    
    const postBtn = this.findElement(this.selectors.postButton);
    
    if (postBtn && !postBtn.disabled) {
      postBtn.click();
      console.log('[LinkedIn Handler] Clicked Post button');
      return true;
    }
    
    console.error('[LinkedIn Handler] Post button not found or disabled');
    return false;
  },
  
  waitForSuccess: async function(timeout = 15000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check for toast
      const toast = this.findElement(this.selectors.successToast);
      if (toast && toast.textContent.toLowerCase().includes('post')) {
        console.log('[LinkedIn Handler] Success detected');
        return true;
      }
      
      // Check if modal closed
      const modal = this.findElement(this.selectors.modal);
      if (!modal) {
        console.log('[LinkedIn Handler] Modal closed - assuming success');
        return true;
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    return false;
  },
  
  publish: async function(options) {
    const { text, mediaFiles, expectedProfileUrl, autoPost = true } = options;
    
    console.log('[LinkedIn Handler] Starting publish flow');
    
    // Verify account
    if (expectedProfileUrl) {
      const verification = this.verifyAccount(expectedProfileUrl);
      if (!verification.verified) {
        return { success: false, error: verification.error, step: 'account_verification' };
      }
    }
    
    // Validate text length
    if (text && text.length > this.config.limits.text) {
      return { success: false, error: `Text exceeds limit: ${text.length}/${this.config.limits.text}`, step: 'validation' };
    }
    
    // Open composer
    const composerOpened = await this.openComposer();
    if (!composerOpened) {
      return { success: false, error: 'Failed to open composer', step: 'open_composer' };
    }
    
    // Upload media if any
    if (mediaFiles && mediaFiles.length > 0) {
      const uploadSuccess = await this.uploadMedia(mediaFiles);
      if (!uploadSuccess) {
        return { success: false, error: 'Failed to upload media', step: 'media_upload' };
      }
    }
    
    // Fill text
    if (text) {
      const fillSuccess = await this.fillText(text);
      if (!fillSuccess) {
        return { success: false, error: 'Failed to fill text', step: 'text_fill' };
      }
    }
    
    // Auto-post
    if (autoPost) {
      const postSuccess = await this.clickPost();
      if (!postSuccess) {
        return { success: false, error: 'Failed to click post button', step: 'post_click' };
      }
      
      const success = await this.waitForSuccess();
      if (!success) {
        return { success: false, error: 'Could not confirm post success', step: 'confirmation' };
      }
      
      return { success: true, message: 'Post published successfully' };
    }
    
    return { success: true, message: 'Content ready - click Post to publish', requiresManualPost: true };
  },
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinkedInHandler;
}

if (typeof window !== 'undefined') {
  window.LinkedInHandler = LinkedInHandler;
}
