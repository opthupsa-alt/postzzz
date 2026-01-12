/**
 * Platform Specifications - Complete Configuration for All Platforms
 * 
 * This file contains all platform-specific configurations including:
 * - Content limits (text, media, formats)
 * - UI selectors for publishing
 * - Account verification methods
 * - Platform-specific fields (e.g., YouTube title, kid-safe option)
 */

// ==================== PLATFORM SPECIFICATIONS ====================

const PLATFORM_SPECS = {
  
  // ==================== X (TWITTER) ====================
  X: {
    name: 'X (Twitter)',
    urls: ['https://x.com', 'https://twitter.com'],
    patterns: ['*://x.com/*', '*://twitter.com/*'],
    composeUrl: 'https://x.com/compose/post',
    profileUrlPattern: /^https?:\/\/(www\.)?(x\.com|twitter\.com)\/([^\/\?]+)/,
    
    // Content Limits
    limits: {
      text: 280,
      textWithMedia: 280,
      images: 4,
      videos: 1,
      videoDuration: 140, // seconds (2:20)
      videoSize: 512 * 1024 * 1024, // 512MB
      imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      videoFormats: ['mp4', 'mov'],
    },
    
    // Supported content types
    supports: {
      textOnly: true,
      image: true,
      video: true,
      carousel: true, // multiple images
      poll: true,
    },
    
    // UI Selectors - Multiple options for different screen sizes/versions
    selectors: {
      // Account verification
      profileLink: [
        'a[data-testid="AppTabBar_Profile_Link"]',
        '[data-testid="SideNav_AccountSwitcher_Button"]',
        'a[href*="/home"][role="link"]',
      ],
      
      // Composer elements
      editor: [
        '[data-testid="tweetTextarea_0"]',
        '[role="textbox"][data-testid]',
        'div[contenteditable="true"][data-testid="tweetTextarea_0"]',
        '.public-DraftEditor-content',
      ],
      
      // File upload
      fileInput: [
        'input[data-testid="fileInput"]',
        'input[type="file"][accept*="image"]',
        'input[type="file"][accept*="video"]',
      ],
      
      // Post button
      postButton: [
        '[data-testid="tweetButtonInline"]',
        '[data-testid="tweetButton"]',
        'button[data-testid="tweetButtonInline"]',
      ],
      
      // Success indicators
      successIndicator: [
        '[data-testid="toast"]',
        '[role="alert"]',
      ],
    },
    
    // Cookie for auth check
    authCookie: 'auth_token',
    cookieDomain: '.x.com',
  },
  
  // ==================== INSTAGRAM ====================
  INSTAGRAM: {
    name: 'Instagram',
    urls: ['https://www.instagram.com'],
    patterns: ['*://www.instagram.com/*', '*://instagram.com/*'],
    composeUrl: 'https://www.instagram.com/',
    profileUrlPattern: /^https?:\/\/(www\.)?instagram\.com\/([^\/\?]+)/,
    
    limits: {
      text: 2200,
      hashtags: 30,
      images: 10, // carousel
      videos: 1,
      reelDuration: 90, // seconds
      postVideoDuration: 60, // seconds
      videoSize: 650 * 1024 * 1024, // 650MB
      imageFormats: ['jpg', 'jpeg', 'png'],
      videoFormats: ['mp4', 'mov'],
      aspectRatios: ['1:1', '4:5', '16:9'],
    },
    
    supports: {
      textOnly: false, // Instagram requires media
      image: true,
      video: true,
      carousel: true,
      reel: true,
      story: true,
    },
    
    selectors: {
      profileLink: [
        'a[href*="/' + '"]', // Dynamic - needs username
        'span._ap3a._aaco._aacw._aad6._aade',
        '[data-testid="user-avatar"]',
      ],
      
      createButton: [
        '[aria-label="New post"]',
        '[aria-label="إنشاء"]',
        '[aria-label="Create"]',
        'svg[aria-label="New post"]',
        'a[href="/create/select/"]',
      ],
      
      fileInput: [
        'input[type="file"][accept*="image"]',
        'input[type="file"][accept*="video"]',
        'input[accept="image/jpeg,image/png,image/heic,image/heif,video/mp4,video/quicktime"]',
      ],
      
      captionField: [
        'textarea[aria-label*="caption"]',
        'textarea[aria-label*="Write a caption"]',
        '[contenteditable="true"][role="textbox"]',
      ],
      
      shareButton: [
        'button:contains("Share")',
        'div[role="button"]:contains("Share")',
        '[type="button"]:contains("مشاركة")',
      ],
      
      nextButton: [
        'button:contains("Next")',
        'div[role="button"]:contains("Next")',
        '[type="button"]:contains("التالي")',
      ],
    },
    
    authCookie: 'sessionid',
    cookieDomain: '.instagram.com',
    
    // Special notes
    notes: [
      'Instagram requires media - cannot post text only',
      'Must upload media first, then add caption',
      'Carousel supports up to 10 images',
    ],
  },
  
  // ==================== FACEBOOK ====================
  FACEBOOK: {
    name: 'Facebook',
    urls: ['https://www.facebook.com'],
    patterns: ['*://www.facebook.com/*', '*://facebook.com/*'],
    composeUrl: 'https://www.facebook.com/',
    profileUrlPattern: /^https?:\/\/(www\.)?facebook\.com\/([^\/\?]+)/,
    
    limits: {
      text: 63206,
      images: 100, // practically unlimited
      videos: 1,
      videoDuration: 240 * 60, // 240 minutes
      videoSize: 10 * 1024 * 1024 * 1024, // 10GB
      imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
      videoFormats: ['mp4', 'mov', 'avi', 'wmv'],
    },
    
    supports: {
      textOnly: true,
      image: true,
      video: true,
      carousel: true,
      story: true,
      reel: true,
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
    },
    
    authCookie: 'c_user',
    cookieDomain: '.facebook.com',
  },
  
  // ==================== LINKEDIN ====================
  LINKEDIN: {
    name: 'LinkedIn',
    urls: ['https://www.linkedin.com'],
    patterns: ['*://www.linkedin.com/*', '*://linkedin.com/*'],
    composeUrl: 'https://www.linkedin.com/feed/',
    profileUrlPattern: /^https?:\/\/(www\.)?linkedin\.com\/in\/([^\/\?]+)/,
    
    limits: {
      text: 3000,
      images: 9,
      videos: 1,
      videoDuration: 10 * 60, // 10 minutes
      videoSize: 5 * 1024 * 1024 * 1024, // 5GB
      imageFormats: ['jpg', 'jpeg', 'png', 'gif'],
      videoFormats: ['mp4', 'asf', 'avi'],
    },
    
    supports: {
      textOnly: true,
      image: true,
      video: true,
      carousel: true,
      document: true, // PDF uploads
      poll: true,
    },
    
    selectors: {
      profileLink: [
        'a[href*="/in/"]',
        '.feed-identity-module__actor-meta',
      ],
      
      startPostButton: [
        '.share-box-feed-entry__trigger',
        '[data-control-name="share.post_entry_point"]',
        'button[aria-label*="Start a post"]',
      ],
      
      editor: [
        '.ql-editor',
        '[role="textbox"][contenteditable="true"]',
        '[data-placeholder*="What do you want to talk about"]',
      ],
      
      postButton: [
        '.share-actions__primary-action',
        'button.share-box-footer__primary-btn',
        'button[aria-label*="Post"]',
        'button.artdeco-button--primary',
      ],
      
      mediaButton: [
        'button[aria-label*="Add a photo"]',
        'button[aria-label*="Add a video"]',
      ],
    },
    
    authCookie: 'li_at',
    cookieDomain: '.linkedin.com',
  },
  
  // ==================== TIKTOK ====================
  TIKTOK: {
    name: 'TikTok',
    urls: ['https://www.tiktok.com'],
    patterns: ['*://www.tiktok.com/*', '*://tiktok.com/*'],
    composeUrl: 'https://www.tiktok.com/creator-center/upload',
    profileUrlPattern: /^https?:\/\/(www\.)?tiktok\.com\/@([^\/\?]+)/,
    
    limits: {
      text: 2200, // caption
      videos: 1,
      videoDuration: 10 * 60, // 10 minutes
      videoSize: 4 * 1024 * 1024 * 1024, // 4GB
      videoFormats: ['mp4', 'mov', 'webm'],
    },
    
    supports: {
      textOnly: false, // TikTok requires video
      image: false,
      video: true,
      carousel: false,
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
      ],
      
      postButton: [
        'button[data-e2e="post-button"]',
        'button:contains("Post")',
      ],
    },
    
    authCookie: 'sessionid_ss',
    cookieDomain: '.tiktok.com',
    
    notes: [
      'TikTok requires video - cannot post images or text only',
      'Must upload video first, then add caption',
    ],
  },
  
  // ==================== YOUTUBE ====================
  YOUTUBE: {
    name: 'YouTube',
    urls: ['https://www.youtube.com', 'https://studio.youtube.com'],
    patterns: ['*://www.youtube.com/*', '*://studio.youtube.com/*'],
    composeUrl: 'https://studio.youtube.com/channel/UC/videos/upload',
    profileUrlPattern: /^https?:\/\/(www\.)?youtube\.com\/(@[^\/\?]+|channel\/[^\/\?]+)/,
    
    limits: {
      title: 100,
      description: 5000,
      tags: 500, // total characters
      videos: 1,
      videoDuration: 12 * 60 * 60, // 12 hours
      videoSize: 256 * 1024 * 1024 * 1024, // 256GB
      videoFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', '3gp', 'webm'],
    },
    
    supports: {
      textOnly: false,
      image: false,
      video: true,
      shorts: true,
    },
    
    // Additional required fields
    requiredFields: {
      title: { required: true, maxLength: 100 },
      description: { required: false, maxLength: 5000 },
      madeForKids: { required: true, type: 'boolean' },
      visibility: { required: true, options: ['public', 'unlisted', 'private'] },
    },
    
    selectors: {
      profileLink: [
        '#avatar-btn',
        'button#avatar-btn',
      ],
      
      uploadButton: [
        '#upload-button',
        '[aria-label*="Upload"]',
        'ytcp-button#create-icon',
      ],
      
      titleField: [
        '#textbox[aria-label*="title"]',
        'ytcp-social-suggestions-textbox #textbox',
      ],
      
      descriptionField: [
        '#description-textarea #textbox',
        '[aria-label*="description"]',
      ],
      
      madeForKidsYes: [
        'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_MFK"]',
      ],
      
      madeForKidsNo: [
        'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
      ],
      
      visibilityPublic: [
        'tp-yt-paper-radio-button[name="PUBLIC"]',
      ],
      
      nextButton: [
        '#next-button',
        'ytcp-button#next-button',
      ],
      
      doneButton: [
        '#done-button',
        'ytcp-button#done-button',
      ],
    },
    
    authCookie: 'LOGIN_INFO',
    cookieDomain: '.youtube.com',
    
    notes: [
      'YouTube requires video',
      'Must set "Made for Kids" option',
      'Must set visibility (public/unlisted/private)',
    ],
  },
  
  // ==================== THREADS ====================
  THREADS: {
    name: 'Threads',
    urls: ['https://www.threads.net'],
    patterns: ['*://www.threads.net/*', '*://threads.net/*'],
    composeUrl: 'https://www.threads.net/',
    profileUrlPattern: /^https?:\/\/(www\.)?threads\.net\/@([^\/\?]+)/,
    
    limits: {
      text: 500,
      images: 10,
      videos: 1,
      videoDuration: 5 * 60, // 5 minutes
      imageFormats: ['jpg', 'jpeg', 'png'],
      videoFormats: ['mp4', 'mov'],
    },
    
    supports: {
      textOnly: true,
      image: true,
      video: true,
      carousel: true,
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
    },
    
    authCookie: 'sessionid',
    cookieDomain: '.threads.net',
  },
  
  // ==================== SNAPCHAT ====================
  SNAPCHAT: {
    name: 'Snapchat',
    urls: ['https://www.snapchat.com', 'https://my.snapchat.com'],
    patterns: ['*://www.snapchat.com/*', '*://my.snapchat.com/*'],
    composeUrl: 'https://my.snapchat.com/',
    profileUrlPattern: /^https?:\/\/(www\.)?(snapchat\.com\/add|my\.snapchat\.com)\/([^\/\?]+)/,
    
    limits: {
      text: 80, // Spotlight caption
      videos: 1,
      videoDuration: 60, // seconds
      videoFormats: ['mp4', 'mov'],
    },
    
    supports: {
      textOnly: false,
      image: true,
      video: true,
      story: true,
      spotlight: true,
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
      ],
    },
    
    authCookie: 'sc-a-session',
    cookieDomain: '.snapchat.com',
    
    notes: [
      'Snapchat Web has limited posting capabilities',
      'Caption limit is 80 characters for Spotlight',
      'Most posting is done via mobile app',
    ],
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract username from profile URL
 */
function extractUsername(profileUrl, platform) {
  if (!profileUrl || !platform) return null;
  
  const spec = PLATFORM_SPECS[platform];
  if (!spec || !spec.profileUrlPattern) return null;
  
  const match = profileUrl.match(spec.profileUrlPattern);
  if (!match) return null;
  
  // The username is typically in the last capture group
  return match[match.length - 1];
}

/**
 * Find element using multiple selectors
 */
function findElement(selectors) {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element) return element;
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return null;
}

/**
 * Find all elements using multiple selectors
 */
function findElements(selectors) {
  const elements = [];
  for (const selector of selectors) {
    try {
      const found = document.querySelectorAll(selector);
      elements.push(...found);
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return elements;
}

/**
 * Validate content against platform limits
 */
function validateContent(platform, content, mediaAssets = []) {
  const spec = PLATFORM_SPECS[platform];
  if (!spec) return { valid: false, errors: ['Unknown platform'] };
  
  const errors = [];
  
  // Check text length
  if (content && content.length > spec.limits.text) {
    errors.push(`Text exceeds limit: ${content.length}/${spec.limits.text} characters`);
  }
  
  // Check if platform requires media
  if (!spec.supports.textOnly && (!mediaAssets || mediaAssets.length === 0)) {
    errors.push(`${spec.name} requires media - cannot post text only`);
  }
  
  // Check media count
  const images = mediaAssets.filter(m => m.type === 'IMAGE');
  const videos = mediaAssets.filter(m => m.type === 'VIDEO');
  
  if (images.length > (spec.limits.images || 0)) {
    errors.push(`Too many images: ${images.length}/${spec.limits.images}`);
  }
  
  if (videos.length > (spec.limits.videos || 0)) {
    errors.push(`Too many videos: ${videos.length}/${spec.limits.videos}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Get platform spec by name
 */
function getPlatformSpec(platform) {
  return PLATFORM_SPECS[platform] || null;
}

/**
 * Get all supported platforms
 */
function getSupportedPlatforms() {
  return Object.keys(PLATFORM_SPECS);
}

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PLATFORM_SPECS,
    extractUsername,
    findElement,
    findElements,
    validateContent,
    getPlatformSpec,
    getSupportedPlatforms,
  };
}

// Also make available globally
if (typeof window !== 'undefined') {
  window.PLATFORM_SPECS = PLATFORM_SPECS;
  window.extractUsername = extractUsername;
  window.findElement = findElement;
  window.findElements = findElements;
  window.validateContent = validateContent;
  window.getPlatformSpec = getPlatformSpec;
  window.getSupportedPlatforms = getSupportedPlatforms;
}
