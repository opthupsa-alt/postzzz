/**
 * Threads Platform Handler (Meta)
 */

const ThreadsHandler = {
  name: 'THREADS',
  displayName: 'Threads',
  
  config: {
    urls: ['https://www.threads.net'],
    composeUrl: 'https://www.threads.net/',
    profileUrlPattern: /^https?:\/\/(www\.)?threads\.net\/@([^\/\?]+)/,
    
    limits: {
      text: 500,
      images: 10,
      videos: 1,
      videoDuration: 300, // 5 minutes
    },
    
    authCookie: 'sessionid',
    cookieDomain: '.threads.net',
  },
  
  selectors: {
    profileLink: [
      'a[href*="/@"]',
      '[data-pressable-container="true"]',
    ],
    
    createButton: [
      '[aria-label="Create"]',
      '[aria-label="إنشاء"]',
      'a[href="/create"]',
      'svg[aria-label="Create"]',
    ],
    
    editor: [
      '[contenteditable="true"][role="textbox"]',
      '[data-lexical-editor="true"]',
      'div[contenteditable="true"]',
    ],
    
    postButton: [
      '[aria-label="Post"]',
      'div[role="button"]:contains("Post")',
      'div[role="button"]:contains("نشر")',
    ],
    
    fileInput: [
      'input[type="file"]',
      'input[accept*="image"]',
      'input[accept*="video"]',
    ],
    
    modal: [
      '[role="dialog"]',
    ],
  },
  
  getCurrentUsername: function() {
    const profileLinks = document.querySelectorAll('a[href*="/@"]');
    for (const link of profileLinks) {
      const match = link.href.match(/@([^\/\?]+)/);
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
  
  openComposer: async function() {
    const createBtn = this.findElement(this.selectors.createButton);
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
    
    // Find Post button
    const buttons = document.querySelectorAll('div[role="button"]');
    for (const btn of buttons) {
      if (btn.textContent === 'Post' || btn.textContent === 'نشر') {
        btn.click();
        return true;
      }
    }
    
    const postBtn = this.findElement(this.selectors.postButton);
    if (postBtn) {
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
      return { success: false, error: `Text exceeds limit: ${text.length}/${this.config.limits.text}`, step: 'validation' };
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
      
      return { success: true, message: 'Thread posted successfully' };
    }
    
    return { success: true, message: 'Content ready - click Post to publish', requiresManualPost: true };
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = ThreadsHandler;
if (typeof window !== 'undefined') window.ThreadsHandler = ThreadsHandler;
