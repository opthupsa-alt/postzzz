/**
 * X (Twitter) Platform Handler
 * 
 * Complete implementation for X/Twitter publishing including:
 * - Account verification
 * - Content publishing (text, images, videos)
 * - Success detection
 * - Error handling
 */

const XTwitterHandler = {
  name: 'X',
  displayName: 'X (Twitter)',
  
  // ==================== CONFIGURATION ====================
  config: {
    urls: ['https://x.com', 'https://twitter.com'],
    composeUrl: 'https://x.com/compose/post',
    profileUrlPattern: /^https?:\/\/(www\.)?(x\.com|twitter\.com)\/([^\/\?]+)/,
    
    limits: {
      text: 280,
      images: 4,
      videos: 1,
      videoDuration: 140,
      videoSize: 512 * 1024 * 1024,
    },
    
    authCookie: 'auth_token',
    cookieDomain: '.x.com',
  },
  
  // ==================== SELECTORS ====================
  // Multiple selectors for different screen sizes and UI versions
  selectors: {
    // Profile/Account elements
    profileLink: [
      'a[data-testid="AppTabBar_Profile_Link"]',
      '[data-testid="SideNav_AccountSwitcher_Button"]',
      'nav[aria-label="Primary"] a[href$="/home"]',
    ],
    
    accountSwitcher: [
      '[data-testid="SideNav_AccountSwitcher_Button"]',
      'button[aria-label*="Account menu"]',
    ],
    
    // Composer elements
    editor: [
      '[data-testid="tweetTextarea_0"]',
      'div[data-testid="tweetTextarea_0"]',
      '[role="textbox"][data-testid="tweetTextarea_0"]',
      '.public-DraftEditor-content[data-testid="tweetTextarea_0"]',
      'div[contenteditable="true"][data-testid="tweetTextarea_0"]',
    ],
    
    // File input for media
    fileInput: [
      'input[data-testid="fileInput"]',
      'input[type="file"][accept*="image"]',
      'input[type="file"][accept*="video"]',
      'input[accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"]',
    ],
    
    // Media button (to trigger file input)
    mediaButton: [
      '[data-testid="fileInput"]',
      'button[aria-label*="Add photos"]',
      'button[aria-label*="Add media"]',
      '[aria-label*="إضافة صور"]',
    ],
    
    // Post/Tweet button
    postButton: [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'button[data-testid="tweetButtonInline"]',
      'button[data-testid="tweetButton"]',
      'div[data-testid="tweetButtonInline"]',
    ],
    
    // Success indicators
    successToast: [
      '[data-testid="toast"]',
      '[role="alert"]',
      'div[data-testid="toast"]',
    ],
    
    // Error indicators
    errorMessage: [
      '[data-testid="toast"][role="alert"]',
      '[role="alert"][data-testid]',
    ],
    
    // Character counter
    charCounter: [
      '[data-testid="tweetTextarea_0_label"]',
      'span[data-testid="tweetTextarea_0_label"]',
    ],
  },
  
  // ==================== ACCOUNT VERIFICATION ====================
  
  /**
   * Extract username from the current page
   * @returns {string|null} Current logged-in username
   */
  getCurrentUsername: function() {
    // Method 1: From profile link in sidebar
    for (const selector of this.selectors.profileLink) {
      const element = document.querySelector(selector);
      if (element && element.href) {
        const match = element.href.match(/\/(x\.com|twitter\.com)\/([^\/\?]+)/);
        if (match && match[2] && match[2] !== 'home') {
          return match[2];
        }
      }
    }
    
    // Method 2: From account switcher button
    for (const selector of this.selectors.accountSwitcher) {
      const element = document.querySelector(selector);
      if (element) {
        // Look for @username in the button
        const text = element.textContent || element.innerText;
        const match = text.match(/@([a-zA-Z0-9_]+)/);
        if (match) {
          return match[1];
        }
        
        // Look for aria-label
        const label = element.getAttribute('aria-label');
        if (label) {
          const labelMatch = label.match(/@([a-zA-Z0-9_]+)/);
          if (labelMatch) {
            return labelMatch[1];
          }
        }
      }
    }
    
    // Method 3: From URL if on profile page
    const urlMatch = window.location.href.match(/\/(x\.com|twitter\.com)\/([^\/\?]+)/);
    if (urlMatch && urlMatch[2] && !['home', 'explore', 'notifications', 'messages', 'compose'].includes(urlMatch[2])) {
      return urlMatch[2];
    }
    
    return null;
  },
  
  /**
   * Extract username from profile URL
   * @param {string} profileUrl - The profile URL
   * @returns {string|null} Username
   */
  extractUsernameFromUrl: function(profileUrl) {
    if (!profileUrl) return null;
    const match = profileUrl.match(this.config.profileUrlPattern);
    return match ? match[3] : null;
  },
  
  /**
   * Verify that the logged-in account matches the expected profile
   * @param {string} expectedProfileUrl - The expected profile URL
   * @returns {object} Verification result
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
  
  // ==================== PUBLISHING ====================
  
  /**
   * Find an element using multiple selectors
   * @param {string[]} selectors - Array of CSS selectors
   * @returns {Element|null}
   */
  findElement: function(selectors) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return null;
  },
  
  /**
   * Wait for an element to appear
   * @param {string[]} selectors - Array of CSS selectors
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<Element|null>}
   */
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
        
        setTimeout(check, 200);
      };
      
      check();
    });
  },
  
  /**
   * Fill the tweet composer with text
   * @param {string} text - Text to post
   * @returns {Promise<boolean>}
   */
  fillText: async function(text) {
    const editor = await this.waitForElement(this.selectors.editor, 5000);
    
    if (!editor) {
      console.error('[X Handler] Editor not found');
      return false;
    }
    
    // Focus the editor
    editor.focus();
    
    // Clear existing content
    editor.innerHTML = '';
    
    // Use multiple methods to insert text
    try {
      // Method 1: execCommand (works in most cases)
      document.execCommand('insertText', false, text);
    } catch (e) {
      // Method 2: Direct text content
      editor.textContent = text;
    }
    
    // Dispatch input event to trigger React state update
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Verify text was inserted
    await new Promise(r => setTimeout(r, 500));
    const currentText = editor.textContent || editor.innerText;
    
    if (currentText.includes(text.substring(0, 20))) {
      console.log('[X Handler] Text filled successfully');
      return true;
    }
    
    console.error('[X Handler] Text fill verification failed');
    return false;
  },
  
  /**
   * Upload media files
   * @param {File[]} files - Array of File objects
   * @returns {Promise<boolean>}
   */
  uploadMedia: async function(files) {
    if (!files || files.length === 0) return true;
    
    const fileInput = this.findElement(this.selectors.fileInput);
    
    if (!fileInput) {
      console.error('[X Handler] File input not found');
      return false;
    }
    
    // Create a DataTransfer to set files
    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }
    
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Wait for upload to process
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('[X Handler] Media upload initiated');
    return true;
  },
  
  /**
   * Click the post button
   * @returns {Promise<boolean>}
   */
  clickPostButton: async function() {
    // Wait a bit for button to become enabled
    await new Promise(r => setTimeout(r, 1000));
    
    const postButton = this.findElement(this.selectors.postButton);
    
    if (!postButton) {
      console.error('[X Handler] Post button not found');
      return false;
    }
    
    // Check if button is disabled
    if (postButton.disabled || postButton.getAttribute('aria-disabled') === 'true') {
      console.error('[X Handler] Post button is disabled');
      return false;
    }
    
    postButton.click();
    console.log('[X Handler] Post button clicked');
    return true;
  },
  
  /**
   * Wait for success indicator
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<boolean>}
   */
  waitForSuccess: async function(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check for success toast
      const toast = this.findElement(this.selectors.successToast);
      if (toast) {
        const text = toast.textContent || toast.innerText;
        if (text.includes('sent') || text.includes('posted') || text.includes('تم')) {
          console.log('[X Handler] Success detected');
          return true;
        }
      }
      
      // Check if composer closed (another success indicator)
      const editor = this.findElement(this.selectors.editor);
      if (!editor) {
        console.log('[X Handler] Composer closed - assuming success');
        return true;
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    return false;
  },
  
  /**
   * Complete publishing flow
   * @param {object} options - Publishing options
   * @returns {Promise<object>}
   */
  publish: async function(options) {
    const { text, mediaFiles, expectedProfileUrl, autoPost = true } = options;
    
    console.log('[X Handler] Starting publish flow');
    
    // Step 1: Verify account if profile URL provided
    if (expectedProfileUrl) {
      const verification = this.verifyAccount(expectedProfileUrl);
      if (!verification.verified) {
        return {
          success: false,
          error: verification.error,
          step: 'account_verification',
        };
      }
      console.log('[X Handler] Account verified:', verification.currentUsername);
    }
    
    // Step 2: Validate content
    if (text && text.length > this.config.limits.text) {
      return {
        success: false,
        error: `Text exceeds limit: ${text.length}/${this.config.limits.text}`,
        step: 'validation',
      };
    }
    
    // Step 3: Upload media if any
    if (mediaFiles && mediaFiles.length > 0) {
      const uploadSuccess = await this.uploadMedia(mediaFiles);
      if (!uploadSuccess) {
        return {
          success: false,
          error: 'Failed to upload media',
          step: 'media_upload',
        };
      }
      
      // Wait for media to process
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Step 4: Fill text
    if (text) {
      const fillSuccess = await this.fillText(text);
      if (!fillSuccess) {
        return {
          success: false,
          error: 'Failed to fill text',
          step: 'text_fill',
        };
      }
    }
    
    // Step 5: Auto-post if enabled
    if (autoPost) {
      await new Promise(r => setTimeout(r, 1000));
      
      const postSuccess = await this.clickPostButton();
      if (!postSuccess) {
        return {
          success: false,
          error: 'Failed to click post button',
          step: 'post_click',
        };
      }
      
      // Step 6: Wait for success
      const success = await this.waitForSuccess(15000);
      if (!success) {
        return {
          success: false,
          error: 'Could not confirm post success',
          step: 'confirmation',
        };
      }
      
      return {
        success: true,
        message: 'Post published successfully',
      };
    }
    
    return {
      success: true,
      message: 'Content filled - ready for manual post',
      requiresManualPost: true,
    };
  },
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XTwitterHandler;
}

if (typeof window !== 'undefined') {
  window.XTwitterHandler = XTwitterHandler;
}
