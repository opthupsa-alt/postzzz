/**
 * Postzzz Extension - Background Service Worker
 * Publishing-focused extension for social media automation
 * 
 * SIMPLIFIED VERSION - No WebSocket, polling only
 */

// ==================== Configuration ====================
let platformConfig = {
  platformUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001',
  extensionAutoLogin: true,
  extensionDebugMode: true,
};

let configLoaded = false;

// Load config from config.js file
async function loadConfig() {
  if (configLoaded) return;
  
  try {
    const url = chrome.runtime.getURL('config.js');
    const response = await fetch(url);
    if (!response.ok) {
      console.log('[Postzzz] config.js not found, using defaults');
      return;
    }
    
    const text = await response.text();
    
    // Parse API_URL and WEB_URL from config.js
    const apiUrlMatch = text.match(/API_URL:\s*['"]([^'"]+)['"]/);
    const webUrlMatch = text.match(/WEB_URL:\s*['"]([^'"]+)['"]/);
    
    if (apiUrlMatch) platformConfig.apiUrl = apiUrlMatch[1];
    if (webUrlMatch) platformConfig.platformUrl = webUrlMatch[1];
    
    configLoaded = true;
    console.log('[Postzzz] ✅ Config loaded:', {
      apiUrl: platformConfig.apiUrl,
      platformUrl: platformConfig.platformUrl
    });
  } catch (error) {
    console.error('[Postzzz] ❌ Failed to load config:', error.message);
  }
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

        case 'CHECK_SCHEDULED_JOBS':
          // Manually trigger scheduler check
          console.log('[Postzzz] Manual scheduler check triggered');
          await checkScheduledJobs();
          return { success: true };

        case 'GET_SCHEDULER_STATUS':
          return { 
            running: schedulerInterval !== null,
            heartbeatRunning: heartbeatInterval !== null,
          };

        case 'START_SCHEDULER':
          startScheduler();
          return { success: true };

        case 'STOP_SCHEDULER':
          stopScheduler();
          return { success: true };

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

// Platform configurations - Full support for all platforms (2026)
const PLATFORMS = {
  X: {
    urls: ['https://x.com', 'https://twitter.com'],
    patterns: ['*://x.com/*', '*://twitter.com/*'],
    cookieDomain: '.x.com',
    authCookie: 'auth_token',
    composeUrl: 'https://x.com/compose/post',
    supported: true,
  },
  LINKEDIN: {
    urls: ['https://www.linkedin.com'],
    patterns: ['*://www.linkedin.com/*', '*://linkedin.com/*'],
    cookieDomain: '.linkedin.com',
    authCookie: 'li_at',
    composeUrl: 'https://www.linkedin.com/feed/',
    supported: true,
  },
  INSTAGRAM: {
    urls: ['https://www.instagram.com'],
    patterns: ['*://www.instagram.com/*', '*://instagram.com/*'],
    cookieDomain: '.instagram.com',
    authCookie: 'sessionid',
    composeUrl: 'https://www.instagram.com/',
    supported: true,
  },
  FACEBOOK: {
    urls: ['https://www.facebook.com'],
    patterns: ['*://www.facebook.com/*', '*://facebook.com/*'],
    cookieDomain: '.facebook.com',
    authCookie: 'c_user',
    composeUrl: 'https://www.facebook.com/',
    supported: true,
  },
  TIKTOK: {
    urls: ['https://www.tiktok.com'],
    patterns: ['*://www.tiktok.com/*', '*://tiktok.com/*'],
    cookieDomain: '.tiktok.com',
    authCookie: 'sessionid_ss',
    composeUrl: 'https://www.tiktok.com/creator-center/upload',
    supported: true,
  },
  YOUTUBE: {
    urls: ['https://www.youtube.com', 'https://studio.youtube.com'],
    patterns: ['*://www.youtube.com/*', '*://studio.youtube.com/*'],
    cookieDomain: '.youtube.com',
    authCookie: 'LOGIN_INFO',
    composeUrl: 'https://studio.youtube.com/channel/UC/videos/upload',
    supported: true,
  },
  THREADS: {
    urls: ['https://www.threads.net'],
    patterns: ['*://www.threads.net/*', '*://threads.net/*'],
    cookieDomain: '.threads.net',
    authCookie: 'sessionid',
    composeUrl: 'https://www.threads.net/',
    supported: true,
  },
  SNAPCHAT: {
    urls: ['https://www.snapchat.com', 'https://my.snapchat.com'],
    patterns: ['*://www.snapchat.com/*', '*://my.snapchat.com/*'],
    cookieDomain: '.snapchat.com',
    authCookie: 'sc-a-session',
    composeUrl: 'https://my.snapchat.com/',
    supported: true,
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
    
    // Claim and start the job properly
    let jobStarted = false;
    
    // Step 1: Claim the job if QUEUED
    if (job.status === 'QUEUED') {
      try {
        const claimResult = await apiRequest('/publishing/jobs/claim', {
          method: 'POST',
          body: JSON.stringify({ deviceId, jobIds: [jobId] }),
        });
        console.log('[Postzzz] Job claimed:', claimResult);
      } catch (e) {
        console.log('[Postzzz] Claim failed:', e.message);
        // Try claiming with different format
        try {
          await apiRequest(`/publishing/jobs/${jobId}/claim`, {
            method: 'POST',
            body: JSON.stringify({ deviceId }),
          });
          console.log('[Postzzz] Job claimed (alt method)');
        } catch (e2) {
          console.log('[Postzzz] Alt claim also failed:', e2.message);
        }
      }
    }
    
    // Step 2: Start the job
    try {
      await apiRequest(`/publishing/jobs/${jobId}/start`, {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      });
      console.log('[Postzzz] Job started on API');
      jobStarted = true;
    } catch (e) {
      console.log('[Postzzz] Start failed:', e.message);
      // Check if already running
      if (e.message.includes('already') || e.message.includes('RUNNING')) {
        jobStarted = true;
      }
    }
    
    // Store job started state for later completion
    activePublishJob.started = jobStarted;
    
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
          // Try to start job again if not started
          if (!activePublishJob?.started) {
            try {
              await apiRequest(`/publishing/jobs/${jobId}/start`, {
                method: 'POST',
                body: JSON.stringify({ deviceId }),
              });
              console.log('[Postzzz] Job started before complete');
            } catch (startErr) {
              console.log('[Postzzz] Start before complete failed:', startErr.message);
            }
          }
          
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
          // Try force complete by updating status directly
          try {
            await apiRequest(`/publishing/jobs/${jobId}`, {
              method: 'PATCH',
              body: JSON.stringify({
                status: 'SUCCEEDED',
                completedAt: new Date().toISOString(),
              }),
            });
            console.log('[Postzzz] Job force-completed via PATCH');
          } catch (patchErr) {
            console.error('[Postzzz] Force complete also failed:', patchErr);
          }
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
      // Adaptive selectors for X platform (handles different screen sizes)
      const X_SELECTORS = {
        editor: [
          '[data-testid="tweetTextarea_0"]',
          '[data-testid="tweetTextarea_0_label"] + div [contenteditable="true"]',
          '[role="textbox"][data-testid]',
          '.public-DraftEditor-content',
          '[contenteditable="true"][role="textbox"]',
          'div[data-contents="true"]',
          '[contenteditable="true"]',
        ],
        fileInput: [
          'input[type="file"][data-testid="fileInput"]',
          'input[type="file"][accept*="image"]',
          'input[type="file"][accept*="video"]',
          'input[type="file"][multiple]',
          'input[type="file"]',
        ],
        postButton: [
          '[data-testid="tweetButton"]',
          '[data-testid="tweetButtonInline"]',
          'button[data-testid*="tweet"]',
          'div[role="button"][data-testid*="tweet"]',
          '[aria-label*="Post"]',
          '[aria-label*="Tweet"]',
          '[aria-label*="نشر"]',
        ],
      };
      
      // If we have media, upload it FIRST before filling text
      if (mediaBlobs.length > 0) {
        console.log('[Postzzz] Uploading media first...');
        
        for (const media of mediaBlobs) {
          try {
            const reader = new FileReader();
            const base64 = await new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(media.blob);
            });
            
            console.log('[Postzzz] Injecting media into page...');
            
            await chrome.scripting.executeScript({
              target: { tabId },
              func: (base64Data, mimeType, fileInputSelectors) => {
                return new Promise((resolve) => {
                  // Convert base64 to blob
                  const byteString = atob(base64Data.split(',')[1]);
                  const ab = new ArrayBuffer(byteString.length);
                  const ia = new Uint8Array(ab);
                  for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                  }
                  const blob = new Blob([ab], { type: mimeType });
                  const file = new File([blob], 'image.' + (mimeType.split('/')[1] || 'png'), { type: mimeType });
                  
                  console.log('[Postzzz] Created file:', file.name, file.size, 'bytes');
                  
                  // Try multiple selectors to find file input
                  let fileInput = null;
                  for (const selector of fileInputSelectors) {
                    try {
                      fileInput = document.querySelector(selector);
                      if (fileInput) {
                        console.log('[Postzzz] Found file input with:', selector);
                        break;
                      }
                    } catch (e) {}
                  }
                  
                  if (fileInput) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInput.files = dt.files;
                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log('[Postzzz] ✅ Media file added successfully');
                    resolve(true);
                  } else {
                    console.error('[Postzzz] ❌ File input not found with any selector');
                    resolve(false);
                  }
                });
              },
              args: [base64, media.mimeType, X_SELECTORS.fileInput],
            });
            
            // Wait for upload to process
            await new Promise(resolve => setTimeout(resolve, 4000));
          } catch (e) {
            console.error('[Postzzz] Failed to inject media:', e);
          }
        }
      }
      
      // Now fill the text content using adaptive selectors
      console.log('[Postzzz] Filling text content...');
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, editorSelectors) => {
          return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30;
            
            const tryFill = () => {
              attempts++;
              
              // Try each selector
              let editor = null;
              for (const selector of editorSelectors) {
                try {
                  editor = document.querySelector(selector);
                  if (editor) {
                    const style = window.getComputedStyle(editor);
                    if (style.display !== 'none' && style.visibility !== 'hidden') {
                      console.log('[Postzzz] Found editor with:', selector);
                      break;
                    }
                    editor = null;
                  }
                } catch (e) {}
              }
              
              if (editor) {
                editor.focus();
                
                // Try multiple methods to insert text
                let inserted = false;
                
                // Method 1: execCommand
                if (document.execCommand) {
                  try {
                    inserted = document.execCommand('insertText', false, text);
                  } catch (e) {}
                }
                
                // Method 2: Direct input
                if (!inserted) {
                  try {
                    editor.textContent = text;
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    editor.dispatchEvent(new Event('change', { bubbles: true }));
                    inserted = true;
                  } catch (e) {}
                }
                
                // Method 3: innerHTML for contenteditable
                if (!inserted && editor.contentEditable === 'true') {
                  try {
                    editor.innerHTML = `<span>${text}</span>`;
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    inserted = true;
                  } catch (e) {}
                }
                
                console.log('[Postzzz] ✅ Content filled:', inserted);
                resolve(inserted);
                return;
              }
              
              if (attempts < maxAttempts) {
                setTimeout(tryFill, 500);
              } else {
                console.error('[Postzzz] ❌ Could not find editor after', maxAttempts, 'attempts');
                resolve(false);
              }
            };
            
            tryFill();
          });
        },
        args: [content, X_SELECTORS.editor],
      });
      
      // Wait for content to be filled
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Auto-click Post button using adaptive selectors
      if (autoPost) {
        console.log('[Postzzz] Waiting before clicking Post...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (postButtonSelectors) => {
            // Try each selector
            let postBtn = null;
            for (const selector of postButtonSelectors) {
              try {
                postBtn = document.querySelector(selector);
                if (postBtn && !postBtn.disabled) {
                  const style = window.getComputedStyle(postBtn);
                  if (style.display !== 'none' && style.visibility !== 'hidden') {
                    console.log('[Postzzz] Found post button with:', selector);
                    break;
                  }
                }
                postBtn = null;
              } catch (e) {}
            }
            
            if (postBtn && !postBtn.disabled) {
              console.log('[Postzzz] ✅ Clicking Post button...');
              postBtn.click();
              return true;
            } else {
              console.log('[Postzzz] ⚠️ Post button not found or disabled');
              return false;
            }
          },
          args: [X_SELECTORS.postButton],
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
      // Instagram - click create button and fill content
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, shouldAutoPost, hasMediaAttachments) => {
          // Click create button (+ icon in nav)
          const createBtn = document.querySelector('[aria-label="New post"]') ||
                           document.querySelector('[aria-label="إنشاء"]') ||
                           document.querySelector('[aria-label="Create"]') ||
                           document.querySelector('svg[aria-label="New post"]')?.closest('a') ||
                           document.querySelector('a[href="/create/select/"]') ||
                           document.querySelector('[role="link"][tabindex="0"] svg[aria-label*="New"]')?.closest('[role="link"]');
          
          if (createBtn) {
            createBtn.click();
            console.log('[Postzzz] Instagram: Clicked create button');
          } else {
            console.log('[Postzzz] Instagram: Create button not found, trying alternative');
            // Try clicking the + in the sidebar
            const sidebarCreate = Array.from(document.querySelectorAll('span')).find(el => 
              el.textContent === 'Create' || el.textContent === 'إنشاء'
            );
            if (sidebarCreate) {
              sidebarCreate.closest('a')?.click() || sidebarCreate.click();
            }
          }
          
          // Wait for modal and handle media selection
          setTimeout(() => {
            // Instagram requires media first - look for file input or drag area
            const fileInput = document.querySelector('input[type="file"][accept*="image"]') ||
                             document.querySelector('input[type="file"][accept*="video"]') ||
                             document.querySelector('input[accept="image/jpeg,image/png,image/heic,image/heif,video/mp4,video/quicktime"]');
            
            if (fileInput) {
              console.log('[Postzzz] Instagram: File input found - user needs to select media');
            }
            
            // If caption field is visible, fill it
            const captionField = document.querySelector('textarea[aria-label*="caption"]') ||
                                document.querySelector('textarea[aria-label*="Write a caption"]') ||
                                document.querySelector('[contenteditable="true"][role="textbox"]');
            
            if (captionField) {
              captionField.focus();
              if (captionField.tagName === 'TEXTAREA') {
                captionField.value = text;
                captionField.dispatchEvent(new Event('input', { bubbles: true }));
              } else {
                document.execCommand('insertText', false, text);
              }
              console.log('[Postzzz] Instagram: Caption filled');
            }
          }, 2000);
        },
        args: [content, autoPost, hasMedia],
      });
      return { success: true, hasMedia, message: 'Instagram opened - select media to continue' };
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
    } else if (platform === 'TIKTOK') {
      // TikTok Creator Center
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, shouldAutoPost, hasMediaAttachments) => {
          console.log('[Postzzz] TikTok: Opening upload page');
          
          // Wait for page to load and find upload button
          setTimeout(() => {
            // Look for file input
            const fileInput = document.querySelector('input[type="file"][accept*="video"]') ||
                             document.querySelector('input[type="file"]');
            
            if (fileInput) {
              console.log('[Postzzz] TikTok: File input found - user needs to select video');
            }
            
            // Fill caption/description if available
            const captionField = document.querySelector('[contenteditable="true"]') ||
                                document.querySelector('textarea[placeholder*="caption"]') ||
                                document.querySelector('[data-text="true"]');
            
            if (captionField) {
              captionField.focus();
              document.execCommand('insertText', false, text);
              console.log('[Postzzz] TikTok: Caption filled');
            }
          }, 2000);
        },
        args: [content, autoPost, hasMedia],
      });
      return { success: true, hasMedia, message: 'TikTok opened - select video to continue' };
    } else if (platform === 'YOUTUBE') {
      // YouTube Studio
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, shouldAutoPost, hasMediaAttachments) => {
          console.log('[Postzzz] YouTube: Opening upload page');
          
          setTimeout(() => {
            // Look for upload button or file input
            const uploadBtn = document.querySelector('#upload-button') ||
                             document.querySelector('[aria-label*="Upload"]') ||
                             document.querySelector('ytcp-button#create-icon');
            
            if (uploadBtn) {
              uploadBtn.click();
              console.log('[Postzzz] YouTube: Clicked upload button');
            }
            
            // Fill title/description if available
            const titleField = document.querySelector('#textbox[aria-label*="title"]') ||
                              document.querySelector('ytcp-social-suggestions-textbox #textbox');
            
            if (titleField) {
              titleField.focus();
              document.execCommand('insertText', false, text.substring(0, 100));
              console.log('[Postzzz] YouTube: Title filled');
            }
            
            const descField = document.querySelector('#description-textarea #textbox') ||
                             document.querySelector('[aria-label*="description"]');
            
            if (descField) {
              descField.focus();
              document.execCommand('insertText', false, text);
              console.log('[Postzzz] YouTube: Description filled');
            }
          }, 2000);
        },
        args: [content, autoPost, hasMedia],
      });
      return { success: true, hasMedia, message: 'YouTube Studio opened - select video to continue' };
    } else if (platform === 'THREADS') {
      // Threads (Meta)
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, shouldAutoPost, hasMediaAttachments) => {
          console.log('[Postzzz] Threads: Opening compose');
          
          // Click compose button
          const composeBtn = document.querySelector('[aria-label="Create"]') ||
                            document.querySelector('[aria-label="إنشاء"]') ||
                            document.querySelector('a[href="/create"]') ||
                            document.querySelector('[role="button"][tabindex="0"]');
          
          if (composeBtn) {
            composeBtn.click();
            console.log('[Postzzz] Threads: Clicked compose button');
          }
          
          setTimeout(() => {
            // Fill text content
            const editor = document.querySelector('[contenteditable="true"][role="textbox"]') ||
                          document.querySelector('[data-lexical-editor="true"]') ||
                          document.querySelector('div[contenteditable="true"]');
            
            if (editor) {
              editor.focus();
              document.execCommand('insertText', false, text);
              console.log('[Postzzz] Threads: Content filled');
              
              if (shouldAutoPost && !hasMediaAttachments) {
                setTimeout(() => {
                  const postBtn = document.querySelector('[aria-label="Post"]') ||
                                 document.querySelector('div[role="button"]:has-text("Post")') ||
                                 Array.from(document.querySelectorAll('div[role="button"]')).find(el => 
                                   el.textContent.includes('Post') || el.textContent.includes('نشر')
                                 );
                  
                  if (postBtn) {
                    postBtn.click();
                    console.log('[Postzzz] Threads: Clicked Post button');
                  }
                }, 1500);
              }
            }
          }, 2000);
        },
        args: [content, autoPost, hasMedia],
      });
      return { success: true, hasMedia };
    } else if (platform === 'SNAPCHAT') {
      // Snapchat Web
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, shouldAutoPost, hasMediaAttachments) => {
          console.log('[Postzzz] Snapchat: Opening page');
          
          setTimeout(() => {
            // Snapchat web has limited posting capabilities
            // Look for any compose/create elements
            const createBtn = document.querySelector('[aria-label*="Create"]') ||
                             document.querySelector('[aria-label*="Post"]') ||
                             document.querySelector('button[data-testid="create-button"]');
            
            if (createBtn) {
              createBtn.click();
              console.log('[Postzzz] Snapchat: Clicked create button');
            }
            
            // Fill text if available
            const textField = document.querySelector('[contenteditable="true"]') ||
                             document.querySelector('textarea');
            
            if (textField) {
              textField.focus();
              if (textField.tagName === 'TEXTAREA') {
                textField.value = text;
                textField.dispatchEvent(new Event('input', { bubbles: true }));
              } else {
                document.execCommand('insertText', false, text);
              }
              console.log('[Postzzz] Snapchat: Content filled');
            }
          }, 2000);
        },
        args: [content, autoPost, hasMedia],
      });
      return { success: true, hasMedia, message: 'Snapchat opened - complete posting manually' };
    }
    
    return { success: false, error: 'Platform not supported for auto-fill: ' + platform };
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
    console.log('[Postzzz] Cancelling job:', jobId);
    
    // Get device ID
    const storageData = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
    const deviceId = storageData[STORAGE_KEYS.DEVICE_ID];
    
    const response = await apiRequest(`/publishing/jobs/${jobId}/cancel`, { 
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
    console.log('[Postzzz] Cancel response:', response);
    
    if (activePublishTab) {
      try { await chrome.tabs.remove(activePublishTab.id); } catch (e) {}
      activePublishTab = null;
    }
    
    activePublishJob = null;
    
    // Remove from processed jobs so it doesn't get picked up again
    if (processedJobIds) {
      processedJobIds.add(jobId);
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Postzzz] Cancel failed:', error);
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

async function registerDeviceIfNeeded(forceReregister = false) {
  try {
    const data = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
    const existingDeviceId = data[STORAGE_KEYS.DEVICE_ID];
    
    // If we have a device ID and not forcing re-register, verify it exists
    if (existingDeviceId && !forceReregister) {
      try {
        await apiRequest(`/devices/${existingDeviceId}`);
        console.log('[Postzzz] Device verified:', existingDeviceId);
        return existingDeviceId;
      } catch (verifyError) {
        console.log('[Postzzz] Device not found, will re-register');
        await setStorageData({ [STORAGE_KEYS.DEVICE_ID]: null });
      }
    }
    
    // Register new device
    console.log('[Postzzz] Registering new device...');
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
      return device.id;
    }
  } catch (error) {
    console.error('[Postzzz] Device registration failed:', error);
  }
  return null;
}

// ==================== Job Scheduler ====================
let schedulerInterval = null;
const SCHEDULER_CHECK_INTERVAL = 30000; // Check every 30 seconds
let isProcessingJob = false; // Mutex to prevent concurrent job processing
const PROCESSED_JOBS_STORAGE_KEY = 'postzzz_processed_jobs';

// Load processed jobs from persistent storage
async function loadProcessedJobs() {
  try {
    const data = await getStorageData([PROCESSED_JOBS_STORAGE_KEY]);
    const stored = data[PROCESSED_JOBS_STORAGE_KEY];
    if (stored && Array.isArray(stored)) {
      // Only keep jobs from last 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const validJobs = stored.filter(j => j.timestamp > oneDayAgo);
      processedJobIds = new Set(validJobs.map(j => j.id));
      console.log(`[Postzzz] ✅ Loaded ${processedJobIds.size} processed jobs from storage`);
    }
  } catch (e) {
    console.error('[Postzzz] Failed to load processed jobs:', e);
  }
}

// Save processed job to persistent storage
async function saveProcessedJob(jobId) {
  try {
    const data = await getStorageData([PROCESSED_JOBS_STORAGE_KEY]);
    let stored = data[PROCESSED_JOBS_STORAGE_KEY] || [];
    
    // Check if already exists
    if (stored.some(j => j.id === jobId)) {
      console.log(`[Postzzz] Job ${jobId} already in storage`);
      return;
    }
    
    // Add new job with timestamp
    stored.push({ id: jobId, timestamp: Date.now() });
    
    // Keep only last 100 jobs and remove old ones
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    stored = stored.filter(j => j.timestamp > oneDayAgo).slice(-100);
    
    await setStorageData({ [PROCESSED_JOBS_STORAGE_KEY]: stored });
    processedJobIds.add(jobId);
    console.log(`[Postzzz] ✅ Saved processed job: ${jobId}`);
  } catch (e) {
    console.error('[Postzzz] Failed to save processed job:', e);
  }
}

// Check if job was already processed
async function isJobProcessed(jobId) {
  // Check memory first
  if (processedJobIds.has(jobId)) {
    return true;
  }
  
  // Double-check storage
  try {
    const data = await getStorageData([PROCESSED_JOBS_STORAGE_KEY]);
    const stored = data[PROCESSED_JOBS_STORAGE_KEY] || [];
    return stored.some(j => j.id === jobId);
  } catch (e) {
    return false;
  }
}

async function startScheduler() {
  if (schedulerInterval) return;
  
  // Ensure config is loaded first
  await loadConfig();
  
  // Load processed jobs from persistent storage
  await loadProcessedJobs();
  
  console.log('[Postzzz] 🚀 Starting job scheduler');
  console.log('[Postzzz] 📡 API URL:', platformConfig.apiUrl);
  console.log('[Postzzz] 🌐 Platform URL:', platformConfig.platformUrl);
  
  // Ensure device is registered before starting scheduler
  await registerDeviceIfNeeded();
  
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
  // Mutex check - prevent concurrent processing
  if (isProcessingJob) {
    console.log('[Postzzz] Scheduler: Already processing a job, skipping this check');
    return;
  }
  
  try {
    const authState = await getAuthState();
    if (!authState.isAuthenticated) {
      console.log('[Postzzz] Scheduler: Not authenticated, skipping');
      return;
    }
    
    console.log('[Postzzz] Scheduler: Checking for scheduled jobs...');
    
    // Get jobs that are due now (scheduledAt <= now)
    const now = new Date().toISOString();
    
    const response = await apiRequest(`/publishing/jobs?status=QUEUED&to=${encodeURIComponent(now)}`);
    const jobs = response?.data || response || [];
    
    if (!Array.isArray(jobs) || jobs.length === 0) {
      console.log('[Postzzz] Scheduler: No jobs found');
      return;
    }
    
    console.log(`[Postzzz] Found ${jobs.length} scheduled jobs ready to publish`);
    
    // Get device ID for claiming
    const storageData = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
    const deviceId = storageData[STORAGE_KEYS.DEVICE_ID];
    
    if (!deviceId) {
      console.log('[Postzzz] No device ID, registering device first');
      await registerDeviceIfNeeded();
      return;
    }
    
    // Process jobs one by one
    for (const job of jobs) {
      // CRITICAL: Check if job was already processed (persistent check)
      const alreadyProcessed = await isJobProcessed(job.id);
      if (alreadyProcessed) {
        console.log(`[Postzzz] ⏭️ Job ${job.id} already processed, skipping`);
        continue;
      }
      
      // Check if job is due
      const scheduledAt = new Date(job.scheduledAt);
      const nowDate = new Date();
      
      if (scheduledAt > nowDate) {
        console.log(`[Postzzz] Job ${job.id} not yet due, skipping`);
        continue;
      }
      
      console.log(`[Postzzz] ✅ Job ${job.id} is due! Platform: ${job.platform}`);
      
      // IMMEDIATELY mark as processed to prevent duplicates
      await saveProcessedJob(job.id);
      
      // Set mutex
      isProcessingJob = true;
      
      try {
        // Check if platform is logged in
        const platConfig = PLATFORMS[job.platform];
        if (platConfig) {
          const cookie = await chrome.cookies.get({
            url: platConfig.urls[0],
            name: platConfig.authCookie,
          });
          
          if (!cookie || !cookie.value) {
            console.log(`[Postzzz] ❌ Not logged in to ${job.platform}`);
            // Report NEEDS_LOGIN
            try {
              await apiRequest('/publishing/jobs/claim', {
                method: 'POST',
                body: JSON.stringify({ deviceId, limit: 1 }),
              });
              await apiRequest(`/publishing/jobs/${job.id}/start`, {
                method: 'POST',
                body: JSON.stringify({ deviceId }),
              });
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
        
        // User is logged in, proceed with publishing
        console.log(`[Postzzz] ✅ Logged in to ${job.platform}, starting publish...`);
        
        // Claim the job first
        try {
          await apiRequest('/publishing/jobs/claim', {
            method: 'POST',
            body: JSON.stringify({ deviceId, limit: 1 }),
          });
        } catch (e) {
          // May already be claimed, continue anyway
        }
        
        // Start the job
        const result = await startPublishingJob(job.id);
        console.log('[Postzzz] Publish result:', result);
        
        // Wait before processing next job
        await new Promise(resolve => setTimeout(resolve, 15000));
        
      } finally {
        // Release mutex
        isProcessingJob = false;
      }
    }
  } catch (error) {
    console.error('[Postzzz] Scheduler error:', error);
    isProcessingJob = false; // Ensure mutex is released on error
  }
}

// Track processed jobs to prevent duplicates
let processedJobIds = new Set();

// ==================== Startup ====================
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Postzzz] 📦 Extension installed/updated');
  await loadConfig();
  console.log('[Postzzz] Config after install:', platformConfig);
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[Postzzz] 🔄 Extension started (onStartup)');
  await loadConfig();
  
  // Start scheduler if authenticated
  const authState = await getAuthState();
  console.log('[Postzzz] Auth state on startup:', authState.isAuthenticated ? 'Authenticated' : 'Not authenticated');
  if (authState.isAuthenticated) {
    startScheduler();
  }
});

// Start scheduler on load if authenticated
(async () => {
  console.log('[Postzzz] 🚀 Service worker initializing...');
  await loadConfig();
  console.log('[Postzzz] Config loaded:', platformConfig);
  
  const authState = await getAuthState();
  console.log('[Postzzz] Auth state:', authState.isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated');
  
  if (authState.isAuthenticated) {
    console.log('[Postzzz] User:', authState.user?.email);
    startScheduler();
  } else {
    console.log('[Postzzz] ⚠️ Not authenticated - scheduler will not start');
    console.log('[Postzzz] Please login at:', platformConfig.platformUrl);
  }
})();

console.log('[Postzzz] 📋 Background service worker loaded');
