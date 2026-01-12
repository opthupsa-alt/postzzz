/**
 * Snapchat Platform Handler
 * NOTE: Snapchat Web has limited posting capabilities
 * Caption limit is 80 characters for Spotlight
 */

const SnapchatHandler = {
  name: 'SNAPCHAT',
  displayName: 'Snapchat',
  
  config: {
    urls: ['https://www.snapchat.com', 'https://my.snapchat.com'],
    composeUrl: 'https://my.snapchat.com/',
    profileUrlPattern: /^https?:\/\/(www\.)?(snapchat\.com\/add|my\.snapchat\.com)\/([^\/\?]+)/,
    
    limits: {
      caption: 80, // Spotlight caption limit
      videos: 1,
      videoDuration: 60, // seconds
    },
    
    authCookie: 'sc-a-session',
    cookieDomain: '.snapchat.com',
    requiresMedia: true,
  },
  
  selectors: {
    profileLink: [
      '[data-testid="profile-button"]',
      'a[href*="/add/"]',
    ],
    
    createButton: [
      '[aria-label*="Create"]',
      '[aria-label*="Post"]',
      'button[data-testid="create-button"]',
    ],
    
    captionField: [
      '[contenteditable="true"]',
      'textarea',
      'input[type="text"]',
    ],
    
    fileInput: [
      'input[type="file"]',
      'input[accept*="video"]',
      'input[accept*="image"]',
    ],
    
    postButton: [
      'button[data-testid="post-button"]',
      'button:contains("Post")',
      'button:contains("Share")',
    ],
  },
  
  getCurrentUsername: function() {
    const profileLink = document.querySelector('a[href*="/add/"]');
    if (profileLink) {
      const match = profileLink.href.match(/\/add\/([^\/\?]+)/);
      if (match) return match[1];
    }
    return null;
  },
  
  extractUsernameFromUrl: function(profileUrl) {
    if (!profileUrl) return null;
    const match = profileUrl.match(this.config.profileUrlPattern);
    return match ? match[3] : null;
  },
  
  verifyAccount: function(expectedProfileUrl) {
    const expectedUsername = this.extractUsernameFromUrl(expectedProfileUrl);
    const currentUsername = this.getCurrentUsername();
    
    if (!expectedUsername) return { verified: false, error: 'Invalid profile URL' };
    if (!currentUsername) return { verified: false, error: 'Could not detect logged-in account' };
    
    const isMatch = expectedUsername.toLowerCase() === currentUsername.toLowerCase();
    return { verified: isMatch, error: isMatch ? null : `Account mismatch`, expectedUsername, currentUsername };
  },
  
  findElement: function(selectors) {
    for (const selector of selectors) {
      try {
        if (selector.includes(':contains(')) {
          const match = selector.match(/(.+):contains\("(.+)"\)/);
          if (match) {
            const elements = document.querySelectorAll(match[1]);
            for (const el of elements) {
              if (el.textContent.includes(match[2])) return el;
            }
          }
          continue;
        }
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
  
  uploadMedia: async function(files) {
    if (!files || files.length === 0) {
      return { success: false, error: 'Snapchat requires media' };
    }
    
    const fileInput = await this.waitForElement(this.selectors.fileInput, 5000);
    if (!fileInput) return { success: false, error: 'File input not found' };
    
    const dataTransfer = new DataTransfer();
    for (const file of files) dataTransfer.items.add(file);
    
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 2000));
    return { success: true };
  },
  
  fillCaption: async function(caption) {
    if (!caption) return true;
    
    // Truncate to 80 characters
    const truncatedCaption = caption.substring(0, 80);
    
    const captionField = await this.waitForElement(this.selectors.captionField, 3000);
    if (!captionField) return true; // Optional
    
    captionField.focus();
    if (captionField.tagName === 'TEXTAREA' || captionField.tagName === 'INPUT') {
      captionField.value = truncatedCaption;
      captionField.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      document.execCommand('insertText', false, truncatedCaption);
    }
    return true;
  },
  
  clickPost: async function() {
    await new Promise(r => setTimeout(r, 1000));
    const postBtn = this.findElement(this.selectors.postButton);
    if (postBtn && !postBtn.disabled) {
      postBtn.click();
      return true;
    }
    return false;
  },
  
  publish: async function(options) {
    const { caption, mediaFiles, expectedProfileUrl, autoPost = true } = options;
    
    if (expectedProfileUrl) {
      const verification = this.verifyAccount(expectedProfileUrl);
      if (!verification.verified) return { success: false, error: verification.error, step: 'account_verification' };
    }
    
    if (!mediaFiles || mediaFiles.length === 0) {
      return { success: false, error: 'Snapchat requires media', step: 'validation' };
    }
    
    // Warn if caption exceeds limit
    if (caption && caption.length > this.config.limits.caption) {
      console.warn(`[Snapchat Handler] Caption will be truncated: ${caption.length}/${this.config.limits.caption}`);
    }
    
    const uploadResult = await this.uploadMedia(mediaFiles);
    if (!uploadResult.success) return { success: false, error: uploadResult.error, step: 'media_upload' };
    
    await this.fillCaption(caption);
    
    if (autoPost) {
      const postSuccess = await this.clickPost();
      if (!postSuccess) return { success: false, error: 'Failed to click post button', step: 'post_click' };
      
      await new Promise(r => setTimeout(r, 3000));
      return { success: true, message: 'Content posted successfully' };
    }
    
    return { success: true, message: 'Content ready - complete posting manually', requiresManualPost: true };
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = SnapchatHandler;
if (typeof window !== 'undefined') window.SnapchatHandler = SnapchatHandler;
