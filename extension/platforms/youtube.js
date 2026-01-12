/**
 * YouTube Platform Handler
 * NOTE: YouTube requires video and has additional required fields (title, made for kids)
 */

const YouTubeHandler = {
  name: 'YOUTUBE',
  displayName: 'YouTube',
  
  config: {
    urls: ['https://www.youtube.com', 'https://studio.youtube.com'],
    composeUrl: 'https://studio.youtube.com/channel/UC/videos/upload',
    profileUrlPattern: /^https?:\/\/(www\.)?youtube\.com\/(@[^\/\?]+|channel\/[^\/\?]+)/,
    
    limits: {
      title: 100,
      description: 5000,
      tags: 500,
      videos: 1,
      videoDuration: 43200, // 12 hours
      videoSize: 256 * 1024 * 1024 * 1024,
    },
    
    authCookie: 'LOGIN_INFO',
    cookieDomain: '.youtube.com',
    requiresMedia: true,
    mediaType: 'video',
    
    // Additional required fields
    requiredFields: ['title', 'madeForKids', 'visibility'],
  },
  
  selectors: {
    profileButton: [
      '#avatar-btn',
      'button#avatar-btn',
      'img#img[alt*="Avatar"]',
    ],
    
    uploadButton: [
      '#upload-button',
      '[aria-label*="Upload"]',
      'ytcp-button#create-icon',
    ],
    
    fileInput: [
      'input[type="file"]',
      '#select-files-button input',
    ],
    
    titleField: [
      '#textbox[aria-label*="title"]',
      'ytcp-social-suggestions-textbox #textbox',
      '#title-textarea #textbox',
    ],
    
    descriptionField: [
      '#description-textarea #textbox',
      '[aria-label*="description"]',
      '#description-container #textbox',
    ],
    
    madeForKidsYes: [
      'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_MFK"]',
      '#made-for-kids-group tp-yt-paper-radio-button:first-child',
    ],
    
    madeForKidsNo: [
      'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
      '#made-for-kids-group tp-yt-paper-radio-button:last-child',
    ],
    
    visibilityPublic: [
      'tp-yt-paper-radio-button[name="PUBLIC"]',
      '#privacy-radios tp-yt-paper-radio-button[name="PUBLIC"]',
    ],
    
    visibilityUnlisted: [
      'tp-yt-paper-radio-button[name="UNLISTED"]',
    ],
    
    visibilityPrivate: [
      'tp-yt-paper-radio-button[name="PRIVATE"]',
    ],
    
    nextButton: [
      '#next-button',
      'ytcp-button#next-button',
    ],
    
    doneButton: [
      '#done-button',
      'ytcp-button#done-button',
    ],
    
    uploadProgress: [
      '.progress-bar',
      'ytcp-video-upload-progress',
    ],
  },
  
  getCurrentUsername: function() {
    // YouTube uses channel handles or IDs
    const channelLink = document.querySelector('a[href*="/channel/"]');
    if (channelLink) {
      const match = channelLink.href.match(/\/channel\/([^\/\?]+)/);
      if (match) return match[1];
    }
    
    const handleLink = document.querySelector('a[href*="/@"]');
    if (handleLink) {
      const match = handleLink.href.match(/@([^\/\?]+)/);
      if (match) return '@' + match[1];
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
    
    // Normalize for comparison
    const normalizedExpected = expectedUsername.replace('@', '').toLowerCase();
    const normalizedCurrent = currentUsername.replace('@', '').toLowerCase();
    
    const isMatch = normalizedExpected === normalizedCurrent;
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
  
  uploadVideo: async function(files) {
    if (!files || files.length === 0) {
      return { success: false, error: 'YouTube requires a video file' };
    }
    
    const videoFile = files.find(f => f.type.startsWith('video/'));
    if (!videoFile) {
      return { success: false, error: 'No video file provided' };
    }
    
    const fileInput = await this.waitForElement(this.selectors.fileInput, 5000);
    if (!fileInput) return { success: false, error: 'File input not found' };
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(videoFile);
    
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Wait for upload to start
    await new Promise(r => setTimeout(r, 3000));
    return { success: true };
  },
  
  fillTitle: async function(title) {
    if (!title) return false;
    
    const titleField = await this.waitForElement(this.selectors.titleField, 5000);
    if (!titleField) return false;
    
    titleField.focus();
    titleField.innerHTML = '';
    document.execCommand('insertText', false, title.substring(0, 100));
    titleField.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  },
  
  fillDescription: async function(description) {
    if (!description) return true;
    
    const descField = await this.waitForElement(this.selectors.descriptionField, 3000);
    if (!descField) return true; // Optional field
    
    descField.focus();
    document.execCommand('insertText', false, description.substring(0, 5000));
    descField.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  },
  
  setMadeForKids: async function(madeForKids = false) {
    await new Promise(r => setTimeout(r, 500));
    
    const selector = madeForKids ? this.selectors.madeForKidsYes : this.selectors.madeForKidsNo;
    const radio = this.findElement(selector);
    
    if (radio) {
      radio.click();
      return true;
    }
    return false;
  },
  
  setVisibility: async function(visibility = 'public') {
    await new Promise(r => setTimeout(r, 500));
    
    let selector;
    switch (visibility.toLowerCase()) {
      case 'unlisted': selector = this.selectors.visibilityUnlisted; break;
      case 'private': selector = this.selectors.visibilityPrivate; break;
      default: selector = this.selectors.visibilityPublic;
    }
    
    const radio = this.findElement(selector);
    if (radio) {
      radio.click();
      return true;
    }
    return false;
  },
  
  clickNext: async function() {
    await new Promise(r => setTimeout(r, 500));
    const nextBtn = this.findElement(this.selectors.nextButton);
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      return true;
    }
    return false;
  },
  
  clickDone: async function() {
    await new Promise(r => setTimeout(r, 500));
    const doneBtn = this.findElement(this.selectors.doneButton);
    if (doneBtn && !doneBtn.disabled) {
      doneBtn.click();
      return true;
    }
    return false;
  },
  
  publish: async function(options) {
    const { 
      title, 
      description, 
      mediaFiles, 
      expectedProfileUrl, 
      madeForKids = false,
      visibility = 'public',
      autoPost = true 
    } = options;
    
    if (expectedProfileUrl) {
      const verification = this.verifyAccount(expectedProfileUrl);
      if (!verification.verified) return { success: false, error: verification.error, step: 'account_verification' };
    }
    
    if (!mediaFiles || mediaFiles.length === 0) {
      return { success: false, error: 'YouTube requires a video file', step: 'validation' };
    }
    
    if (!title) {
      return { success: false, error: 'YouTube requires a video title', step: 'validation' };
    }
    
    // Upload video
    const uploadResult = await this.uploadVideo(mediaFiles);
    if (!uploadResult.success) return { success: false, error: uploadResult.error, step: 'video_upload' };
    
    // Fill title
    const titleSuccess = await this.fillTitle(title);
    if (!titleSuccess) return { success: false, error: 'Failed to fill title', step: 'title_fill' };
    
    // Fill description
    await this.fillDescription(description);
    
    // Set made for kids
    await this.setMadeForKids(madeForKids);
    
    // Click Next through steps
    await this.clickNext(); // Details -> Video elements
    await this.clickNext(); // Video elements -> Checks
    await this.clickNext(); // Checks -> Visibility
    
    // Set visibility
    await this.setVisibility(visibility);
    
    if (autoPost) {
      const doneSuccess = await this.clickDone();
      if (!doneSuccess) return { success: false, error: 'Failed to click done button', step: 'done_click' };
      
      await new Promise(r => setTimeout(r, 3000));
      return { success: true, message: 'Video published successfully' };
    }
    
    return { success: true, message: 'Video ready - click Done to publish', requiresManualPost: true };
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = YouTubeHandler;
if (typeof window !== 'undefined') window.YouTubeHandler = YouTubeHandler;
