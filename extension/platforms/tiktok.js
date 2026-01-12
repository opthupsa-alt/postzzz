/**
 * TikTok Platform Handler
 * NOTE: TikTok requires video - cannot post images or text only
 */

const TikTokHandler = {
  name: 'TIKTOK',
  displayName: 'TikTok',
  
  config: {
    urls: ['https://www.tiktok.com'],
    composeUrl: 'https://www.tiktok.com/creator-center/upload',
    profileUrlPattern: /^https?:\/\/(www\.)?tiktok\.com\/@([^\/\?]+)/,
    
    limits: {
      caption: 2200,
      videos: 1,
      videoDuration: 600, // 10 minutes
      videoSize: 4 * 1024 * 1024 * 1024,
    },
    
    authCookie: 'sessionid_ss',
    cookieDomain: '.tiktok.com',
    requiresMedia: true,
    mediaType: 'video',
  },
  
  selectors: {
    profileLink: [
      'a[href*="/@"]',
      '[data-e2e="profile-icon"]',
    ],
    
    fileInput: [
      'input[type="file"][accept*="video"]',
      'input[type="file"]',
    ],
    
    captionField: [
      '[contenteditable="true"]',
      'textarea[placeholder*="caption"]',
      '[data-text="true"]',
      '.public-DraftEditor-content',
    ],
    
    postButton: [
      'button[data-e2e="post-button"]',
      'button:contains("Post")',
      'button:contains("نشر")',
    ],
    
    uploadArea: [
      '[data-e2e="upload-card"]',
      '.upload-card',
    ],
  },
  
  getCurrentUsername: function() {
    const profileLink = document.querySelector('a[href*="/@"]');
    if (profileLink) {
      const match = profileLink.href.match(/@([^\/\?]+)/);
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
  
  uploadVideo: async function(files) {
    if (!files || files.length === 0) {
      return { success: false, error: 'TikTok requires a video file' };
    }
    
    const videoFile = files.find(f => f.type.startsWith('video/'));
    if (!videoFile) {
      return { success: false, error: 'No video file provided - TikTok only supports videos' };
    }
    
    const fileInput = await this.waitForElement(this.selectors.fileInput, 5000);
    if (!fileInput) return { success: false, error: 'File input not found' };
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(videoFile);
    
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 3000));
    return { success: true };
  },
  
  fillCaption: async function(caption) {
    if (!caption) return true;
    
    const captionField = await this.waitForElement(this.selectors.captionField, 5000);
    if (!captionField) return false;
    
    captionField.focus();
    document.execCommand('insertText', false, caption);
    captionField.dispatchEvent(new Event('input', { bubbles: true }));
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
      return { success: false, error: 'TikTok requires a video file', step: 'validation' };
    }
    
    const uploadResult = await this.uploadVideo(mediaFiles);
    if (!uploadResult.success) return { success: false, error: uploadResult.error, step: 'video_upload' };
    
    if (caption) {
      const fillSuccess = await this.fillCaption(caption);
      if (!fillSuccess) return { success: false, error: 'Failed to fill caption', step: 'caption_fill' };
    }
    
    if (autoPost) {
      const postSuccess = await this.clickPost();
      if (!postSuccess) return { success: false, error: 'Failed to click post button', step: 'post_click' };
      
      await new Promise(r => setTimeout(r, 5000));
      return { success: true, message: 'Video posted successfully' };
    }
    
    return { success: true, message: 'Video ready - click Post to publish', requiresManualPost: true };
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = TikTokHandler;
if (typeof window !== 'undefined') window.TikTokHandler = TikTokHandler;
