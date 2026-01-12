/**
 * Platform Specifications for Postzzz Extension
 * Updated for 2026 platform requirements
 * 
 * Contains:
 * - Content limits (text, media)
 * - Adaptive selectors for different screen sizes
 * - Platform-specific publishing logic
 */

const PLATFORM_SPECS = {
  X: {
    name: 'X (Twitter)',
    limits: {
      text: {
        standard: 280,
        premium: 25000,
      },
      images: {
        max: 4,
        maxSizeMB: 5,
        formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        aspectRatios: ['16:9', '4:3', '1:1'],
      },
      video: {
        maxDurationSeconds: 140, // 2:20
        maxSizeMB: 512,
        formats: ['mp4', 'mov'],
      },
    },
    selectors: {
      // Multiple selectors for different screen sizes and layouts
      editor: [
        '[data-testid="tweetTextarea_0"]',
        '[data-testid="tweetTextarea_0_label"] + div [contenteditable="true"]',
        '[role="textbox"][data-testid]',
        '.public-DraftEditor-content',
        '[contenteditable="true"][role="textbox"]',
        'div[data-contents="true"]',
      ],
      fileInput: [
        'input[type="file"][data-testid="fileInput"]',
        'input[type="file"][accept*="image"]',
        'input[type="file"][accept*="video"]',
        'input[type="file"][multiple]',
      ],
      postButton: [
        '[data-testid="tweetButton"]',
        '[data-testid="tweetButtonInline"]',
        'button[data-testid*="tweet"]',
        'div[role="button"][data-testid*="tweet"]',
        '[aria-label*="Post"]',
        '[aria-label*="Tweet"]',
      ],
      mediaButton: [
        '[data-testid="fileInput"]',
        '[aria-label*="Add photos"]',
        '[aria-label*="Media"]',
        '[aria-label*="صور"]',
        '[aria-label*="وسائط"]',
      ],
    },
    composeUrl: 'https://x.com/compose/post',
    urls: ['https://x.com', 'https://twitter.com'],
    authCookie: 'auth_token',
  },

  INSTAGRAM: {
    name: 'Instagram',
    limits: {
      text: {
        caption: 2200,
        bio: 150,
        hashtags: 30,
      },
      images: {
        max: 10,
        maxSizeMB: 8,
        formats: ['jpg', 'jpeg', 'png'],
        aspectRatios: ['1:1', '4:5', '1.91:1'],
        minWidth: 320,
        maxWidth: 1080,
      },
      video: {
        feed: { maxDurationSeconds: 60, maxSizeMB: 250 },
        reels: { maxDurationSeconds: 90, maxSizeMB: 250 },
        stories: { maxDurationSeconds: 60, maxSizeMB: 250 },
      },
    },
    selectors: {
      editor: [
        'textarea[aria-label*="caption"]',
        'textarea[aria-label*="Write a caption"]',
        'textarea[placeholder*="Write a caption"]',
        '[contenteditable="true"]',
        'textarea',
      ],
      fileInput: [
        'input[type="file"][accept*="image"]',
        'input[type="file"][accept*="video"]',
        'input[type="file"]',
      ],
      postButton: [
        'button[type="submit"]',
        '[aria-label*="Share"]',
        '[aria-label*="مشاركة"]',
        'button:contains("Share")',
      ],
      nextButton: [
        '[aria-label*="Next"]',
        '[aria-label*="التالي"]',
        'button:contains("Next")',
      ],
    },
    composeUrl: 'https://www.instagram.com/',
    urls: ['https://www.instagram.com'],
    authCookie: 'sessionid',
    notes: 'Instagram requires manual posting - auto-post not fully supported',
  },

  FACEBOOK: {
    name: 'Facebook',
    limits: {
      text: {
        post: 63206,
        comment: 8000,
      },
      images: {
        max: 10,
        maxSizeMB: 25,
        formats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
      },
      video: {
        maxDurationMinutes: 240,
        maxSizeGB: 10,
        formats: ['mp4', 'mov', 'avi', 'wmv'],
      },
    },
    selectors: {
      createPostButton: [
        '[aria-label*="Create a post"]',
        '[aria-label*="What\'s on your mind"]',
        '[aria-label*="إنشاء منشور"]',
        '[aria-label*="بم تفكر"]',
        '[role="button"][tabindex="0"]',
        'div[data-pagelet*="FeedComposer"]',
      ],
      editor: [
        '[contenteditable="true"][role="textbox"]',
        '[data-lexical-editor="true"]',
        '[aria-label*="What\'s on your mind"]',
        '[aria-label*="بم تفكر"]',
        'div[contenteditable="true"]',
      ],
      fileInput: [
        'input[type="file"][accept*="image"]',
        'input[type="file"][accept*="video"]',
        'input[type="file"]',
      ],
      postButton: [
        '[aria-label="Post"]',
        '[aria-label="نشر"]',
        'div[aria-label="Post"][role="button"]',
        'div[aria-label="نشر"][role="button"]',
        'span:contains("Post")',
      ],
      photoVideoButton: [
        '[aria-label*="Photo/video"]',
        '[aria-label*="صورة/فيديو"]',
      ],
    },
    composeUrl: 'https://www.facebook.com/',
    urls: ['https://www.facebook.com'],
    authCookie: 'c_user',
  },

  LINKEDIN: {
    name: 'LinkedIn',
    limits: {
      text: {
        post: 3000,
        article: 125000,
        comment: 1250,
      },
      images: {
        max: 9,
        maxSizeMB: 8,
        formats: ['jpg', 'jpeg', 'png', 'gif'],
      },
      video: {
        maxDurationMinutes: 10,
        maxSizeMB: 5120, // 5GB
        formats: ['mp4', 'mov', 'avi'],
      },
      documents: {
        maxSizeMB: 100,
        formats: ['pdf', 'ppt', 'pptx', 'doc', 'docx'],
      },
    },
    selectors: {
      startPostButton: [
        '.share-box-feed-entry__trigger',
        '[data-control-name="share.post_entry_point"]',
        'button[aria-label*="Start a post"]',
        'button[aria-label*="بدء منشور"]',
        '[data-test-id="share-box-feed-entry__trigger"]',
      ],
      editor: [
        '.ql-editor',
        '[role="textbox"][contenteditable="true"]',
        '[data-placeholder*="What do you want to talk about"]',
        '[aria-label*="Text editor"]',
        '[contenteditable="true"]',
      ],
      fileInput: [
        'input[type="file"][accept*="image"]',
        'input[type="file"][accept*="video"]',
        'input[type="file"]',
      ],
      postButton: [
        '.share-actions__primary-action',
        'button.share-box-footer__primary-btn',
        'button[aria-label*="Post"]',
        'button[aria-label*="نشر"]',
        'button.artdeco-button--primary',
      ],
      mediaButton: [
        '[aria-label*="Add a photo"]',
        '[aria-label*="Add media"]',
        '[aria-label*="إضافة صورة"]',
      ],
    },
    composeUrl: 'https://www.linkedin.com/feed/',
    urls: ['https://www.linkedin.com'],
    authCookie: 'li_at',
  },

  TIKTOK: {
    name: 'TikTok',
    limits: {
      text: {
        caption: 2200,
        hashtags: 100,
      },
      video: {
        maxDurationMinutes: 10,
        maxSizeMB: 287, // Web upload limit
        formats: ['mp4', 'mov', 'webm'],
        minDurationSeconds: 3,
        aspectRatios: ['9:16', '1:1'],
      },
    },
    selectors: {
      editor: [
        '[data-e2e="caption-input"]',
        'textarea[placeholder*="caption"]',
        '[contenteditable="true"]',
      ],
      fileInput: [
        'input[type="file"][accept*="video"]',
        'input[type="file"]',
      ],
      postButton: [
        '[data-e2e="post-button"]',
        'button:contains("Post")',
        '[aria-label*="Post"]',
      ],
    },
    composeUrl: 'https://www.tiktok.com/upload',
    urls: ['https://www.tiktok.com'],
    authCookie: 'sessionid',
    notes: 'TikTok is video-only platform',
  },
};

/**
 * Find element using multiple selectors with fallback
 * Handles different screen sizes and layout changes
 */
function findElement(selectors, context = document) {
  for (const selector of selectors) {
    try {
      const element = context.querySelector(selector);
      if (element && isElementVisible(element)) {
        console.log(`[Postzzz] Found element with selector: ${selector}`);
        return element;
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return null;
}

/**
 * Find all elements using multiple selectors
 */
function findAllElements(selectors, context = document) {
  const results = [];
  for (const selector of selectors) {
    try {
      const elements = context.querySelectorAll(selector);
      elements.forEach(el => {
        if (isElementVisible(el) && !results.includes(el)) {
          results.push(el);
        }
      });
    } catch (e) {
      // Invalid selector, skip
    }
  }
  return results;
}

/**
 * Check if element is visible on screen
 */
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Wait for element to appear with timeout
 */
function waitForElement(selectors, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      const element = findElement(selectors);
      if (element) {
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Element not found after ${timeout}ms`));
        return;
      }
      
      setTimeout(check, 500);
    };
    
    check();
  });
}

/**
 * Wait for element using MutationObserver (more efficient)
 */
function waitForElementObserver(selectors, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Check if already exists
    const existing = findElement(selectors);
    if (existing) {
      resolve(existing);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found after ${timeout}ms`));
    }, timeout);
    
    const observer = new MutationObserver((mutations, obs) => {
      const element = findElement(selectors);
      if (element) {
        clearTimeout(timeoutId);
        obs.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

/**
 * Validate content against platform limits
 */
function validateContent(platform, content, mediaAssets = []) {
  const spec = PLATFORM_SPECS[platform];
  if (!spec) {
    return { valid: false, errors: [`Unknown platform: ${platform}`] };
  }
  
  const errors = [];
  const warnings = [];
  
  // Check text length
  if (content) {
    const textLimit = spec.limits.text.standard || spec.limits.text.post || spec.limits.text.caption;
    if (content.length > textLimit) {
      errors.push(`Text exceeds ${platform} limit of ${textLimit} characters (current: ${content.length})`);
    }
  }
  
  // Check media
  if (mediaAssets.length > 0) {
    const imageAssets = mediaAssets.filter(a => a.type === 'IMAGE');
    const videoAssets = mediaAssets.filter(a => a.type === 'VIDEO');
    
    // Check image count
    if (spec.limits.images && imageAssets.length > spec.limits.images.max) {
      errors.push(`Too many images for ${platform}. Max: ${spec.limits.images.max}, Current: ${imageAssets.length}`);
    }
    
    // TikTok is video-only
    if (platform === 'TIKTOK' && imageAssets.length > 0 && videoAssets.length === 0) {
      errors.push('TikTok requires video content');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PLATFORM_SPECS,
    findElement,
    findAllElements,
    isElementVisible,
    waitForElement,
    waitForElementObserver,
    validateContent,
  };
}
