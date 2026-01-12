/**
 * Facebook Platform Handler
 */

const FacebookHandler = {
  name: 'FACEBOOK',
  displayName: 'Facebook',
  
  config: {
    urls: ['https://www.facebook.com'],
    composeUrl: 'https://www.facebook.com/',
    profileUrlPattern: /^https?:\/\/(www\.)?facebook\.com\/([^\/\?]+)/,
    
    limits: {
      text: 63206,
      images: 100,
      videos: 1,
      videoDuration: 14400, // 240 minutes
      videoSize: 10 * 1024 * 1024 * 1024,
    },
    
    authCookie: 'c_user',
    cookieDomain: '.facebook.com',
  },
  
  selectors: {
    profileLink: [
      '[aria-label="Your profile"]',
      'a[href*="/me"]',
      '[data-pagelet="ProfileTilesFeed"]',
    ],
    
    createPostButton: [
      '[aria-label*="Create a post"]',
      '[aria-label*="What\'s on your mind"]',
      '[aria-label*="ما الذي يدور في ذهنك"]',
      '[role="button"][tabindex="0"]',
    ],
    
    editor: [
      '[contenteditable="true"][role="textbox"]',
      '[data-lexical-editor="true"]',
      'div[contenteditable="true"][spellcheck="true"]',
    ],
    
    postButton: [
      '[aria-label="Post"]',
      'div[aria-label="Post"][role="button"]',
      '[aria-label="نشر"]',
    ],
    
    photoVideoButton: [
      '[aria-label*="Photo/video"]',
      '[aria-label*="صورة/فيديو"]',
    ],
    
    fileInput: [
      'input[type="file"][accept*="image"]',
      'input[type="file"][accept*="video"]',
      'input[type="file"]',
    ],
    
    modal: [
      '[role="dialog"]',
      '[aria-modal="true"]',
    ],
  },
  
  getCurrentUsername: function() {
    const profileLink = document.querySelector('[aria-label="Your profile"]');
    if (profileLink && profileLink.href) {
      const match = profileLink.href.match(/facebook\.com\/([^\/\?]+)/);
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
    
    if (!expectedUsername) return { verified: false, error: 'Invalid profile URL' };
    if (!currentUsername) return { verified: false, error: 'Could not detect logged-in account' };
    
    const isMatch = expectedUsername.toLowerCase() === currentUsername.toLowerCase();
    return { verified: isMatch, error: isMatch ? null : `Account mismatch`, expectedUsername, currentUsername };
  },
  
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
  
  openComposer: async function() {
    const createBtn = this.findElement(this.selectors.createPostButton);
    if (createBtn) {
      createBtn.click();
      await new Promise(r => setTimeout(r, 1500));
      return true;
    }
    return false;
  },
  
  fillText: async function(text) {
    const editor = await this.waitForElement(this.selectors.editor, 5000);
    if (!editor) return false;
    
    editor.focus();
    document.execCommand('insertText', false, text);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  },
  
  uploadMedia: async function(files) {
    if (!files || files.length === 0) return true;
    
    const photoBtn = this.findElement(this.selectors.photoVideoButton);
    if (photoBtn) {
      photoBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    
    const fileInput = await this.waitForElement(this.selectors.fileInput, 3000);
    if (!fileInput) return false;
    
    const dataTransfer = new DataTransfer();
    for (const file of files) dataTransfer.items.add(file);
    
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 2000));
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
  
  waitForSuccess: async function(timeout = 15000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const modal = this.findElement(this.selectors.modal);
      if (!modal) return true;
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  },
  
  publish: async function(options) {
    const { text, mediaFiles, expectedProfileUrl, autoPost = true } = options;
    
    if (expectedProfileUrl) {
      const verification = this.verifyAccount(expectedProfileUrl);
      if (!verification.verified) return { success: false, error: verification.error, step: 'account_verification' };
    }
    
    if (text && text.length > this.config.limits.text) {
      return { success: false, error: `Text exceeds limit`, step: 'validation' };
    }
    
    const composerOpened = await this.openComposer();
    if (!composerOpened) return { success: false, error: 'Failed to open composer', step: 'open_composer' };
    
    if (mediaFiles && mediaFiles.length > 0) {
      const uploadSuccess = await this.uploadMedia(mediaFiles);
      if (!uploadSuccess) return { success: false, error: 'Failed to upload media', step: 'media_upload' };
    }
    
    if (text) {
      const fillSuccess = await this.fillText(text);
      if (!fillSuccess) return { success: false, error: 'Failed to fill text', step: 'text_fill' };
    }
    
    if (autoPost) {
      const postSuccess = await this.clickPost();
      if (!postSuccess) return { success: false, error: 'Failed to click post button', step: 'post_click' };
      
      const success = await this.waitForSuccess();
      if (!success) return { success: false, error: 'Could not confirm post success', step: 'confirmation' };
      
      return { success: true, message: 'Post published successfully' };
    }
    
    return { success: true, message: 'Content ready - click Post to publish', requiresManualPost: true };
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = FacebookHandler;
if (typeof window !== 'undefined') window.FacebookHandler = FacebookHandler;
