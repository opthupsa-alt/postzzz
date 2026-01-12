/**
 * Postzzz Extension - Background Service Worker
 * Publishing-focused extension for social media automation
 * 
 * SIMPLIFIED VERSION - No WebSocket, polling only
 */

// ==================== Configuration ====================
let platformConfig = {
  platformUrl: 'https://leedz.vercel.app',
  apiUrl: 'https://leedz-api.onrender.com',
  extensionAutoLogin: true,
  extensionDebugMode: false,
};

// Load config from config files
async function loadConfig() {
  const configFiles = ['config.js', 'config.production.js'];
  
  for (const configFile of configFiles) {
    try {
      const url = chrome.runtime.getURL(configFile);
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const text = await response.text();
      const apiUrlMatch = text.match(/API_URL:\s*['"]([^'"]+)['"]/);
      const webUrlMatch = text.match(/WEB_URL:\s*['"]([^'"]+)['"]/);
      
      if (apiUrlMatch) platformConfig.apiUrl = apiUrlMatch[1];
      if (webUrlMatch) platformConfig.platformUrl = webUrlMatch[1];
      
      console.log(`[Postzzz] Config loaded from ${configFile}:`, {
        apiUrl: platformConfig.apiUrl,
        platformUrl: platformConfig.platformUrl
      });
      return;
    } catch (error) {
      // Try next file
    }
  }
  
  console.log('[Postzzz] Using default config');
}

// Load config immediately
loadConfig();

// ==================== Storage ====================
const STORAGE_KEYS = {
  AUTH_TOKEN: 'postzzz_auth_token',
  USER: 'postzzz_user',
  TENANT: 'postzzz_tenant',
  DEVICE_ID: 'postzzz_device_id',
  SELECTED_CLIENT_ID: 'postzzz_selected_client_id',
};

async function getStorageData(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

async function setStorageData(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

async function clearStorageData() {
  return new Promise((resolve) => chrome.storage.local.clear(resolve));
}

// ==================== API ====================
async function apiRequest(endpoint, options = {}) {
  const { [STORAGE_KEYS.AUTH_TOKEN]: token } = await getStorageData([STORAGE_KEYS.AUTH_TOKEN]);
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${platformConfig.apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== Auth ====================
async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  await setStorageData({
    [STORAGE_KEYS.AUTH_TOKEN]: data.token,
    [STORAGE_KEYS.USER]: data.user,
    [STORAGE_KEYS.TENANT]: data.tenant || data.user?.defaultTenant,
  });

  // Start scheduler after login
  startScheduler();

  return data;
}

async function logout() {
  stopScheduler();
  await clearStorageData();
}

async function getAuthState() {
  const data = await getStorageData([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.TENANT,
  ]);

  return {
    isAuthenticated: !!data[STORAGE_KEYS.AUTH_TOKEN],
    token: data[STORAGE_KEYS.AUTH_TOKEN],
    user: data[STORAGE_KEYS.USER],
    tenant: data[STORAGE_KEYS.TENANT],
  };
}

async function verifyToken() {
  try {
    const { isAuthenticated } = await getAuthState();
    if (!isAuthenticated) return false;

    await apiRequest('/auth/me');
    return true;
  } catch (error) {
    console.log('[Postzzz] Token invalid, clearing');
    await logout();
    return false;
  }
}

// ==================== Auto-Login from Platform ====================
async function checkPlatformLogin() {
  try {
    // First check if already authenticated
    const authState = await getAuthState();
    if (authState.isAuthenticated) {
      const valid = await verifyToken();
      if (valid) {
        return { success: true, user: authState.user };
      }
    }

    // Try to get auth from platform tab
    const platformUrl = platformConfig.platformUrl;
    const tabs = await chrome.tabs.query({});
    const platformOrigin = new URL(platformUrl).origin;
    
    const platformTab = tabs.find(tab => {
      try {
        return tab.url && new URL(tab.url).origin === platformOrigin;
      } catch {
        return false;
      }
    });
    
    if (!platformTab) {
      return { success: false, reason: 'no_platform_tab', platformUrl };
    }

    // Read auth from platform localStorage
    const results = await chrome.scripting.executeScript({
      target: { tabId: platformTab.id },
      func: () => {
        const token = localStorage.getItem('leedz_token') || localStorage.getItem('postzzz_token');
        const user = localStorage.getItem('leedz_user') || localStorage.getItem('postzzz_user');
        const tenant = localStorage.getItem('leedz_tenant') || localStorage.getItem('postzzz_tenant');
        
        return {
          token,
          user: user ? JSON.parse(user) : null,
          tenant: tenant ? JSON.parse(tenant) : null,
        };
      },
    });
    
    const result = results[0]?.result;
    
    if (result && result.token) {
      // Verify the token
      const verifyResponse = await fetch(`${platformConfig.apiUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${result.token}` }
      });
      
      if (verifyResponse.ok) {
        const userData = await verifyResponse.json();
        
        await setStorageData({
          [STORAGE_KEYS.AUTH_TOKEN]: result.token,
          [STORAGE_KEYS.USER]: userData.user || userData,
          [STORAGE_KEYS.TENANT]: userData.tenant || result.tenant,
        });
        
        return { success: true, user: userData.user || userData };
      }
    }
    
    return { success: false, reason: 'not_logged_in', platformUrl };
  } catch (error) {
    console.error('[Postzzz] Auto-login error:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

// ==================== Message Handler ====================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (message.type) {
        case 'LOGIN':
          return await login(message.email, message.password);

        case 'LOGOUT':
          await logout();
          return { success: true };

        case 'GET_AUTH_STATE':
          return await getAuthState();

        case 'VERIFY_TOKEN':
          return { valid: await verifyToken() };

        case 'CHECK_PLATFORM_LOGIN':
          return await checkPlatformLogin();

        case 'GET_PLATFORM_CONFIG':
          return platformConfig;

        case 'OPEN_PLATFORM':
          const tab = await chrome.tabs.create({ url: platformConfig.platformUrl });
          return { success: true, tabId: tab.id };

        case 'CONNECT_WEBSOCKET':
        case 'DISCONNECT_WEBSOCKET':
          // WebSocket removed - using polling only
          return { success: true };

        case 'GET_WS_STATUS':
          return { connected: false };

        // ==================== Runner UI Messages ====================
        
        case 'GET_CLIENTS':
          try {
            const response = await apiRequest('/clients');
            // Handle both {data: [...]} and direct array
            const clients = response?.data || response || [];
            const selectedData = await getStorageData([STORAGE_KEYS.SELECTED_CLIENT_ID]);
            return { 
              clients: Array.isArray(clients) ? clients : [], 
              selectedClientId: selectedData[STORAGE_KEYS.SELECTED_CLIENT_ID] 
            };
          } catch (error) {
            console.error('[Postzzz] GET_CLIENTS error:', error);
            return { clients: [], error: error.message };
          }

        case 'GET_CLAIMED_JOBS':
          try {
            const response = await apiRequest('/publishing/jobs?status=QUEUED&limit=20');
            const jobs = response?.data || response || [];
            return { jobs: Array.isArray(jobs) ? jobs : [] };
          } catch (error) {
            console.error('[Postzzz] GET_CLAIMED_JOBS error:', error);
            return { jobs: [], error: error.message };
          }

        case 'SET_SELECTED_CLIENT':
          await setStorageData({ [STORAGE_KEYS.SELECTED_CLIENT_ID]: message.clientId });
          return { success: true };

        case 'GET_DEVICE_STATUS':
          const devData = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
          return { deviceId: devData[STORAGE_KEYS.DEVICE_ID] };

        case 'REGISTER_DEVICE':
          try {
            const response = await apiRequest('/devices/register', {
              method: 'POST',
              body: JSON.stringify({
                name: 'Chrome Extension',
                userAgent: navigator.userAgent,
              }),
            });
            // Handle {data: device} wrapper
            const device = response?.data || response;
            if (device?.id) {
              await setStorageData({ [STORAGE_KEYS.DEVICE_ID]: device.id });
              console.log('[Postzzz] Device registered:', device.id);
            }
            return { success: true, device };
          } catch (error) {
            console.error('[Postzzz] Device registration failed:', error);
            return { success: false, error: error.message };
          }

        case 'CHECK_PLATFORM_LOGINS':
          return await checkAllPlatformLogins();

        case 'START_JOB':
          return await startPublishingJob(message.jobId);

        case 'CONFIRM_PUBLISH':
          return await confirmPublishJob(message.jobId);

        case 'CANCEL_JOB':
          return await cancelPublishingJob(message.jobId);

        case 'CAPTURE_SCREENSHOT':
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            return { success: true, dataUrl };
          } catch (error) {
            return { success: false, error: error.message };
          }

        default:
          return { error: 'Unknown message type: ' + message.type };
      }
    } catch (error) {
      console.error('[Postzzz] Message handler error:', error);
      return { error: error.message };
    }
  };

  handleMessage().then(sendResponse);
  return true;
});

// ==================== Publishing Functions ====================

// Platform configurations
const PLATFORMS = {
  X: {
    urls: ['https://x.com', 'https://twitter.com'],
    patterns: ['*://x.com/*', '*://twitter.com/*'],
    cookieDomain: '.x.com',
    authCookie: 'auth_token',
    composeUrl: 'https://x.com/compose/post',
  },
  LINKEDIN: {
    urls: ['https://www.linkedin.com'],
    patterns: ['*://www.linkedin.com/*', '*://linkedin.com/*'],
    cookieDomain: '.linkedin.com',
    authCookie: 'li_at',
    composeUrl: 'https://www.linkedin.com/feed/',
  },
  INSTAGRAM: {
    urls: ['https://www.instagram.com'],
    patterns: ['*://www.instagram.com/*', '*://instagram.com/*'],
    cookieDomain: '.instagram.com',
    authCookie: 'sessionid',
    composeUrl: 'https://www.instagram.com/',
  },
  FACEBOOK: {
    urls: ['https://www.facebook.com'],
    patterns: ['*://www.facebook.com/*', '*://facebook.com/*'],
    cookieDomain: '.facebook.com',
    authCookie: 'c_user',
    composeUrl: 'https://www.facebook.com/',
  },
};

async function checkAllPlatformLogins() {
  const status = {};
  
  for (const [platform, config] of Object.entries(PLATFORMS)) {
    try {
      // Method 1: Check cookies (most reliable)
      const cookie = await chrome.cookies.get({
        url: config.urls[0],
        name: config.authCookie,
      });
      
      if (cookie && cookie.value) {
        status[platform] = 'LOGGED_IN';
        console.log(`[Postzzz] ${platform}: LOGGED_IN (cookie found)`);
        continue;
      }
      
      // Method 2: Check if tab exists and try DOM detection
      let tabs = [];
      for (const pattern of config.patterns) {
        const found = await chrome.tabs.query({ url: pattern });
        if (found.length > 0) {
          tabs = found;
          break;
        }
      }
      
      if (tabs.length === 0) {
        status[platform] = 'NO_TAB';
        console.log(`[Postzzz] ${platform}: NO_TAB`);
        continue;
      }
      
      // Try DOM detection as fallback
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            // Generic logged-in detection
            const hasAvatar = document.querySelector('img[alt*="profile"], img[alt*="avatar"], [data-testid*="avatar"]');
            const hasLogout = document.querySelector('[href*="logout"], [data-testid*="logout"], button[aria-label*="Account"]');
            const hasLogin = document.querySelector('input[type="password"], [href*="login"], [data-testid="loginButton"]');
            
            if (hasAvatar || hasLogout) return 'LOGGED_IN';
            if (hasLogin) return 'NEEDS_LOGIN';
            return 'UNKNOWN';
          },
        });
        
        status[platform] = results[0]?.result || 'UNKNOWN';
      } catch (scriptError) {
        status[platform] = 'UNKNOWN';
      }
      
      console.log(`[Postzzz] ${platform}: ${status[platform]}`);
    } catch (error) {
      console.error(`[Postzzz] Error checking ${platform}:`, error);
      status[platform] = 'ERROR';
    }
  }
  
  return { status };
}

let activePublishJob = null;
let activePublishTab = null;

// Wait for tab to fully load
async function waitForTabComplete(tabId, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          resolve(tab);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(tab); // Resolve anyway after timeout
          return;
        }
        
        setTimeout(checkTab, 300);
      } catch (error) {
        reject(error);
      }
    };
    
    checkTab();
  });
}

async function startPublishingJob(jobId) {
  try {
    console.log('[Postzzz] Starting job:', jobId);
    
    // Get device ID
    const storageData = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
    const deviceId = storageData[STORAGE_KEYS.DEVICE_ID];
    
    if (!deviceId) {
      console.error('[Postzzz] No device ID');
      return { success: false, error: 'No device ID' };
    }
    
    const response = await apiRequest(`/publishing/jobs/${jobId}`);
    const job = response?.data || response;
    if (!job) {
      return { success: false, error: 'Job not found' };
    }
    
    console.log('[Postzzz] Job details:', job);
    activePublishJob = job;
    
    const platformConfig = PLATFORMS[job.platform];
    if (!platformConfig) {
      return { success: false, error: 'Unsupported platform: ' + job.platform };
    }
    
    // Claim the job if not already claimed
    if (job.status === 'QUEUED') {
      try {
        await apiRequest('/publishing/jobs/claim', {
          method: 'POST',
          body: JSON.stringify({ deviceId, limit: 1 }),
        });
        console.log('[Postzzz] Job claimed');
      } catch (e) {
        console.log('[Postzzz] Claim failed, may already be claimed:', e.message);
      }
    }
    
    // Start the job on API
    try {
      await apiRequest(`/publishing/jobs/${jobId}/start`, {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      });
      console.log('[Postzzz] Job started on API');
    } catch (e) {
      console.log('[Postzzz] Start failed:', e.message);
      // Continue anyway - might already be started
    }
    
    // Open compose page
    activePublishTab = await chrome.tabs.create({ 
      url: platformConfig.composeUrl,
      active: true 
    });
    
    console.log('[Postzzz] Opened tab:', activePublishTab.id);
    
    // Wait for tab to load completely
    await waitForTabComplete(activePublishTab.id);
    
    // Extra wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get content to post
    const variant = job.post?.variants?.find(v => v.platform === job.platform);
    const content = variant?.caption || job.post?.content || job.content || '';
    const mediaAssets = variant?.mediaAssets || [];
    
    console.log('[Postzzz] Content to post:', content.substring(0, 50) + '...');
    console.log('[Postzzz] Media assets:', mediaAssets.length);
    
    // Fill content based on platform
    const fillResult = await fillPlatformContent(job.platform, content, activePublishTab.id, true, mediaAssets);
    
    if (!fillResult.success) {
      console.error('[Postzzz] Failed to fill content:', fillResult.error);
      // Report failure
      try {
        await apiRequest(`/publishing/jobs/${jobId}/complete`, {
          method: 'POST',
          body: JSON.stringify({
            deviceId,
            status: 'FAILED',
            errorCode: 'FILL_FAILED',
            errorMessage: fillResult.error || 'Failed to fill content',
          }),
        });
      } catch (e) {
        console.error('[Postzzz] Failed to report error:', e);
      }
      return { success: false, error: fillResult.error };
    }
    
    // If no media, auto-complete after a delay (assuming auto-post worked)
    if (!fillResult.hasMedia) {
      setTimeout(async () => {
        try {
          await apiRequest(`/publishing/jobs/${jobId}/complete`, {
            method: 'POST',
            body: JSON.stringify({
              deviceId,
              status: 'SUCCEEDED',
            }),
          });
          console.log('[Postzzz] Job completed successfully');
        } catch (e) {
          console.error('[Postzzz] Failed to complete job:', e);
        }
      }, 5000);
    }
    
    return { success: true, message: 'Content filled. Please review and click Post.' };
  } catch (error) {
    console.error('[Postzzz] Start job error:', error);
    return { success: false, error: error.message };
  }
}

async function fillPlatformContent(platform, content, tabId, autoPost = true, mediaAssets = []) {
  try {
    // Check if there are media assets with URLs
    const hasMedia = mediaAssets && mediaAssets.length > 0;
    
    // If there are media assets, we need to handle them
    let mediaBlobs = [];
    if (hasMedia) {
      console.log('[Postzzz] Processing media assets:', mediaAssets.length);
      for (const asset of mediaAssets) {
        if (asset.url) {
          try {
            let blob;
            
            // Check if it's a data URL (base64)
            if (asset.url.startsWith('data:')) {
              // Convert data URL to blob
              const [header, base64Data] = asset.url.split(',');
              const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
              const byteString = atob(base64Data);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              blob = new Blob([ab], { type: mimeType });
              console.log('[Postzzz] Converted data URL to blob:', mimeType, blob.size, 'bytes');
            } else {
              // Fetch the media file from URL
              const response = await fetch(asset.url);
              blob = await response.blob();
            }
            
            mediaBlobs.push({
              blob,
              type: asset.type,
              mimeType: asset.mimeType || blob.type,
            });
            console.log('[Postzzz] Processed media:', asset.type, blob.size, 'bytes');
          } catch (e) {
            console.error('[Postzzz] Failed to process media:', e);
          }
        }
      }
    }
    
    if (platform === 'X') {
      // First fill the text content, then handle media
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text) => {
          // Wait for composer to appear
          let attempts = 0;
          const maxAttempts = 20;
          
          const tryFill = () => {
            attempts++;
            const editor = document.querySelector('[data-testid="tweetTextarea_0"]') ||
                          document.querySelector('[data-testid="tweetTextarea_0_label"]')?.nextElementSibling ||
                          document.querySelector('[role="textbox"][data-testid]') ||
                          document.querySelector('.public-DraftEditor-content') ||
                          document.querySelector('[contenteditable="true"]');
            
            if (editor) {
              editor.focus();
              if (document.execCommand) {
                document.execCommand('insertText', false, text);
              } else {
                editor.textContent = text;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
              }
              console.log('[Postzzz] Content filled successfully');
              return true;
            }
            
            if (attempts < maxAttempts) {
              setTimeout(tryFill, 500);
            }
            return false;
          };
          
          tryFill();
        },
        args: [content],
      });
      
      // Wait for content to be filled
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If we have media, upload via clipboard paste
      if (mediaBlobs.length > 0) {
        for (const media of mediaBlobs) {
          try {
            // Convert blob to base64 for transfer to content script
            const reader = new FileReader();
            const base64 = await new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(media.blob);
            });
            
            await chrome.scripting.executeScript({
              target: { tabId },
              func: async (base64Data, mimeType) => {
                // Convert base64 to blob
                const byteString = atob(base64Data.split(',')[1]);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeType });
                
                // Try clipboard paste method
                try {
                  const clipboardItem = new ClipboardItem({ [mimeType]: blob });
                  await navigator.clipboard.write([clipboardItem]);
                  
                  // Focus editor and paste
                  const editor = document.querySelector('[data-testid="tweetTextarea_0"]') ||
                                document.querySelector('[contenteditable="true"]');
                  if (editor) {
                    editor.focus();
                    document.execCommand('paste');
                    console.log('[Postzzz] Media pasted from clipboard');
                    return true;
                  }
                } catch (clipboardError) {
                  console.log('[Postzzz] Clipboard paste failed, trying file input');
                }
                
                // Fallback: Try to find and click media button, then use file input
                const mediaBtn = document.querySelector('[data-testid="fileInput"]')?.closest('button') ||
                                document.querySelector('[aria-label*="Add photos"]') ||
                                document.querySelector('[aria-label*="Media"]') ||
                                document.querySelector('input[type="file"][accept*="image"]')?.closest('div')?.querySelector('button');
                
                if (mediaBtn) {
                  mediaBtn.click();
                  await new Promise(r => setTimeout(r, 500));
                }
                
                // Find file input
                const fileInput = document.querySelector('input[type="file"][accept*="image"]') ||
                                 document.querySelector('input[type="file"][accept*="video"]') ||
                                 document.querySelector('input[type="file"]');
                
                if (fileInput) {
                  const file = new File([blob], 'media.' + mimeType.split('/')[1], { type: mimeType });
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  fileInput.files = dt.files;
                  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log('[Postzzz] Media file added to input');
                  return true;
                }
                
                console.error('[Postzzz] Could not upload media');
                return false;
              },
              args: [base64, media.mimeType],
            });
            
            // Wait for upload to process
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (e) {
            console.error('[Postzzz] Failed to inject media:', e);
          }
        }
      }
      
      // Auto-click Post button after media is uploaded
      if (autoPost) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const postBtn = document.querySelector('[data-testid="tweetButton"]') ||
                           document.querySelector('[data-testid="tweetButtonInline"]') ||
                           document.querySelector('button[data-testid*="tweet"]') ||
                           document.querySelector('div[role="button"][data-testid*="tweet"]');
            
            if (postBtn && !postBtn.disabled) {
              console.log('[Postzzz] Clicking Post button...');
              postBtn.click();
            } else {
              console.log('[Postzzz] Post button not found or disabled');
            }
          },
          args: [],
        });
      }
      return { success: true, hasMedia };
    } else if (platform === 'LINKEDIN') {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, shouldAutoPost, hasMediaAttachments) => {
          // Click "Start a post" button
          const startPostBtn = document.querySelector('.share-box-feed-entry__trigger') ||
                              document.querySelector('[data-control-name="share.post_entry_point"]') ||
                              document.querySelector('button[aria-label*="Start a post"]');
          
          if (startPostBtn) {
            startPostBtn.click();
          }
          
          // Wait for modal and fill
          setTimeout(() => {
            const editor = document.querySelector('.ql-editor') ||
                          document.querySelector('[role="textbox"][contenteditable="true"]') ||
                          document.querySelector('[data-placeholder*="What do you want to talk about"]');
            
            if (editor) {
              editor.focus();
              editor.innerHTML = `<p>${text}</p>`;
              editor.dispatchEvent(new Event('input', { bubbles: true }));
              console.log('[Postzzz] LinkedIn content filled');
              
              // Don't auto-post if there are media attachments
              if (hasMediaAttachments) {
                console.log('[Postzzz] Media attachments detected - user needs to add manually');
                return;
              }
              
              // Auto-click Post button if enabled
              if (shouldAutoPost) {
                setTimeout(() => {
                  const postBtn = document.querySelector('.share-actions__primary-action') ||
                                 document.querySelector('button.share-box-footer__primary-btn') ||
                                 document.querySelector('button[aria-label*="Post"]') ||
                                 document.querySelector('button.artdeco-button--primary');
                  
                  if (postBtn && !postBtn.disabled) {
                    console.log('[Postzzz] Clicking Post button...');
                    postBtn.click();
                  } else {
                    console.log('[Postzzz] Post button not found or disabled');
                  }
                }, 1500);
              }
            }
          }, 1500);
        },
        args: [content, autoPost, hasMedia],
      });
      return { success: true, hasMedia };
    } else if (platform === 'INSTAGRAM') {
      // Instagram requires different approach - just open the page
      console.log('[Postzzz] Instagram auto-post not supported yet');
      return { success: true, message: 'Instagram requires manual posting' };
    } else if (platform === 'FACEBOOK') {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, shouldAutoPost, hasMediaAttachments) => {
          // Click "What's on your mind" to open composer
          const createPostBtn = document.querySelector('[aria-label*="Create a post"]') ||
                               document.querySelector('[aria-label*="What\'s on your mind"]') ||
                               document.querySelector('[role="button"][tabindex="0"]');
          
          if (createPostBtn) {
            createPostBtn.click();
          }
          
          setTimeout(() => {
            const editor = document.querySelector('[contenteditable="true"][role="textbox"]') ||
                          document.querySelector('[data-lexical-editor="true"]');
            
            if (editor) {
              editor.focus();
              document.execCommand('insertText', false, text);
              console.log('[Postzzz] Facebook content filled');
              
              // Don't auto-post if there are media attachments
              if (hasMediaAttachments) {
                console.log('[Postzzz] Media attachments detected - user needs to add manually');
                return;
              }
              
              if (shouldAutoPost) {
                setTimeout(() => {
                  const postBtn = document.querySelector('[aria-label="Post"]') ||
                                 document.querySelector('div[aria-label="Post"][role="button"]');
                  
                  if (postBtn && !postBtn.disabled) {
                    console.log('[Postzzz] Clicking Post button...');
                    postBtn.click();
                  }
                }, 1500);
              }
            }
          }, 2000);
        },
        args: [content, autoPost, hasMedia],
      });
      return { success: true, hasMedia };
    }
    
    return { success: false, error: 'Platform not supported for auto-fill' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function confirmPublishJob(jobId) {
  if (!activePublishJob || activePublishJob.id !== jobId) {
    return { success: false, error: 'No active job' };
  }
  
  try {
    const screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    
    await apiRequest(`/publishing/jobs/${jobId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'SUCCEEDED',
        proofScreenshot: screenshot,
      }),
    });
    
    activePublishJob = null;
    return { success: true };
  } catch (error) {
    console.error('[Postzzz] Confirm publish error:', error);
    return { success: false, error: error.message };
  }
}

async function cancelPublishingJob(jobId) {
  try {
    await apiRequest(`/publishing/jobs/${jobId}/cancel`, { method: 'POST' });
    
    if (activePublishTab) {
      try { await chrome.tabs.remove(activePublishTab.id); } catch (e) {}
      activePublishTab = null;
    }
    
    activePublishJob = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== External Message Handler ====================
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const handleExternalMessage = async () => {
    const platformOrigin = new URL(platformConfig.platformUrl).origin;
    if (sender.origin !== platformOrigin) {
      return { error: 'Unauthorized origin' };
    }

    switch (message.type) {
      case 'SYNC_AUTH':
        if (message.token && message.user) {
          await setStorageData({
            [STORAGE_KEYS.AUTH_TOKEN]: message.token,
            [STORAGE_KEYS.USER]: message.user,
            [STORAGE_KEYS.TENANT]: message.tenant,
          });
          return { success: true };
        }
        return { success: false };

      case 'LOGOUT':
        await logout();
        return { success: true };

      case 'PING':
        return { pong: true, version: '2.0.0' };

      default:
        return { error: 'Unknown message type' };
    }
  };

  handleExternalMessage().then(sendResponse);
  return true;
});

// ==================== Setup ====================
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ==================== Heartbeat ====================
let heartbeatInterval = null;
const HEARTBEAT_INTERVAL = 30000; // Send heartbeat every 30 seconds

async function startHeartbeat() {
  if (heartbeatInterval) return;
  
  console.log('[Postzzz] Starting heartbeat');
  
  // Send immediately
  sendHeartbeat();
  
  // Then send periodically
  heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[Postzzz] Heartbeat stopped');
  }
}

async function sendHeartbeat() {
  try {
    const data = await getStorageData([STORAGE_KEYS.DEVICE_ID, STORAGE_KEYS.SELECTED_CLIENT_ID]);
    const deviceId = data[STORAGE_KEYS.DEVICE_ID];
    
    if (!deviceId) {
      console.log('[Postzzz] No device ID, registering device first');
      await registerDeviceIfNeeded();
      return;
    }
    
    const response = await apiRequest(`/devices/${deviceId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({
        clientId: data[STORAGE_KEYS.SELECTED_CLIENT_ID] || undefined,
        capabilities: {
          assistMode: true,
          autoMode: false,
          platforms: ['X', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'THREADS'],
        },
        version: chrome.runtime.getManifest().version,
      }),
    });
    
    console.log('[Postzzz] Heartbeat sent successfully');
    return response;
  } catch (error) {
    console.error('[Postzzz] Heartbeat failed:', error.message);
    
    // If device not found, re-register
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.log('[Postzzz] Device not found, re-registering...');
      await setStorageData({ [STORAGE_KEYS.DEVICE_ID]: null });
      await registerDeviceIfNeeded();
    }
  }
}

async function registerDeviceIfNeeded() {
  try {
    const data = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
    if (data[STORAGE_KEYS.DEVICE_ID]) return;
    
    const response = await apiRequest('/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Chrome Extension',
        userAgent: navigator.userAgent,
        version: chrome.runtime.getManifest().version,
        capabilities: {
          assistMode: true,
          autoMode: false,
          platforms: ['X', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'THREADS'],
        },
      }),
    });
    
    const device = response?.data || response;
    if (device?.id) {
      await setStorageData({ [STORAGE_KEYS.DEVICE_ID]: device.id });
      console.log('[Postzzz] Device registered:', device.id);
    }
  } catch (error) {
    console.error('[Postzzz] Device registration failed:', error);
  }
}

// ==================== Job Scheduler ====================
let schedulerInterval = null;
const SCHEDULER_CHECK_INTERVAL = 30000; // Check every 30 seconds

async function startScheduler() {
  if (schedulerInterval) return;
  
  console.log('[Postzzz] Starting job scheduler');
  schedulerInterval = setInterval(checkScheduledJobs, SCHEDULER_CHECK_INTERVAL);
  // Run immediately
  checkScheduledJobs();
  
  // Also start heartbeat
  startHeartbeat();
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Postzzz] Scheduler stopped');
  }
  stopHeartbeat();
}

async function checkScheduledJobs() {
  try {
    const authState = await getAuthState();
    if (!authState.isAuthenticated) return;
    
    // Get jobs that are due now (scheduledAt <= now)
    const now = new Date().toISOString();
    const response = await apiRequest(`/publishing/jobs?status=QUEUED&to=${encodeURIComponent(now)}`);
    const jobs = response?.data || response || [];
    
    if (!Array.isArray(jobs) || jobs.length === 0) return;
    
    console.log(`[Postzzz] Found ${jobs.length} scheduled jobs ready to publish`);
    
    // Get device ID for claiming
    const storageData = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
    const deviceId = storageData[STORAGE_KEYS.DEVICE_ID];
    
    if (!deviceId) {
      console.log('[Postzzz] No device ID, registering device first');
      await registerDevice();
      return;
    }
    
    // Process jobs one by one
    for (const job of jobs) {
      // Check if job is due
      const scheduledAt = new Date(job.scheduledAt);
      const nowDate = new Date();
      
      if (scheduledAt <= nowDate) {
        console.log(`[Postzzz] Auto-publishing job ${job.id} for platform ${job.platform}`);
        
        // Check if platform is logged in
        const platformConfig = PLATFORMS[job.platform];
        if (platformConfig) {
          const cookie = await chrome.cookies.get({
            url: platformConfig.urls[0],
            name: platformConfig.authCookie,
          });
          
          if (!cookie || !cookie.value) {
            console.log(`[Postzzz] Not logged in to ${job.platform}, skipping job`);
            // Claim, start, then report NEEDS_LOGIN status
            try {
              // Claim the job
              await apiRequest('/publishing/jobs/claim', {
                method: 'POST',
                body: JSON.stringify({ deviceId, limit: 1 }),
              });
              // Start the job
              await apiRequest(`/publishing/jobs/${job.id}/start`, {
                method: 'POST',
                body: JSON.stringify({ deviceId }),
              });
              // Complete with NEEDS_LOGIN
              await apiRequest(`/publishing/jobs/${job.id}/complete`, {
                method: 'POST',
                body: JSON.stringify({
                  deviceId,
                  status: 'NEEDS_LOGIN',
                  errorCode: 'NOT_LOGGED_IN',
                  errorMessage: `Not logged in to ${job.platform}`,
                }),
              });
            } catch (e) {
              console.error('[Postzzz] Failed to report NEEDS_LOGIN:', e);
            }
            continue;
          }
        }
        
        // Claim the job first
        try {
          await apiRequest('/publishing/jobs/claim', {
            method: 'POST',
            body: JSON.stringify({
              deviceId,
              limit: 1,
            }),
          });
        } catch (e) {
          console.log('[Postzzz] Could not claim job, may already be claimed');
        }
        
        // Start the job
        await startPublishingJob(job.id);
        
        // Wait before processing next job
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error('[Postzzz] Scheduler error:', error);
  }
}

// ==================== Startup ====================
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Postzzz] Extension installed/updated');
  await loadConfig();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[Postzzz] Extension started');
  await loadConfig();
  
  // Start scheduler if authenticated
  const authState = await getAuthState();
  if (authState.isAuthenticated) {
    startScheduler();
  }
});

// Start scheduler on load if authenticated
(async () => {
  await loadConfig();
  const authState = await getAuthState();
  if (authState.isAuthenticated) {
    startScheduler();
  }
})();

console.log('[Postzzz] Background service worker loaded');
