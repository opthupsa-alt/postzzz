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

  return data;
}

async function logout() {
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
            const device = await apiRequest('/devices/register', {
              method: 'POST',
              body: JSON.stringify({
                name: 'Chrome Extension',
                userAgent: navigator.userAgent,
              }),
            });
            if (device?.id) {
              await setStorageData({ [STORAGE_KEYS.DEVICE_ID]: device.id });
            }
            return { success: true, device };
          } catch (error) {
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

const PLATFORM_URLS = {
  X: 'https://x.com',
  LINKEDIN: 'https://www.linkedin.com',
  INSTAGRAM: 'https://www.instagram.com',
  FACEBOOK: 'https://www.facebook.com',
};

async function checkAllPlatformLogins() {
  const status = {};
  
  for (const [platform, url] of Object.entries(PLATFORM_URLS)) {
    try {
      const tabs = await chrome.tabs.query({ url: `${url}/*` });
      if (tabs.length === 0) {
        status[platform] = 'UNKNOWN';
        continue;
      }
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (p) => {
          const detectors = {
            X: () => {
              if (document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')) return 'LOGGED_IN';
              if (document.querySelector('[data-testid="loginButton"]')) return 'NEEDS_LOGIN';
              return 'UNKNOWN';
            },
            LINKEDIN: () => {
              if (document.querySelector('.global-nav__me-photo')) return 'LOGGED_IN';
              if (document.querySelector('[data-tracking-control-name*="sign-in"]')) return 'NEEDS_LOGIN';
              return 'UNKNOWN';
            },
            INSTAGRAM: () => {
              if (document.querySelector('[data-testid="user-avatar"]')) return 'LOGGED_IN';
              if (document.querySelector('input[name="username"]')) return 'NEEDS_LOGIN';
              return 'UNKNOWN';
            },
            FACEBOOK: () => {
              if (document.querySelector('[aria-label="Your profile"]')) return 'LOGGED_IN';
              if (document.querySelector('#email')) return 'NEEDS_LOGIN';
              return 'UNKNOWN';
            },
          };
          return detectors[p] ? detectors[p]() : 'UNKNOWN';
        },
        args: [platform],
      });
      
      status[platform] = results[0]?.result || 'UNKNOWN';
    } catch (error) {
      status[platform] = 'UNKNOWN';
    }
  }
  
  return { status };
}

let activePublishJob = null;
let activePublishTab = null;

async function startPublishingJob(jobId) {
  try {
    const response = await apiRequest(`/publishing/jobs/${jobId}`);
    const job = response?.data || response;
    if (!job) {
      return { success: false, error: 'Job not found' };
    }
    
    activePublishJob = job;
    
    const composeUrls = {
      X: 'https://x.com/compose/post',
      LINKEDIN: 'https://www.linkedin.com/feed/',
      INSTAGRAM: 'https://www.instagram.com/',
      FACEBOOK: 'https://www.facebook.com/',
    };
    
    activePublishTab = await chrome.tabs.create({ 
      url: composeUrls[job.platform] || PLATFORM_URLS[job.platform],
      active: true 
    });
    
    // Wait for tab to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get content
    const variant = job.post?.variants?.find(v => v.platform === job.platform);
    const content = variant?.caption || job.post?.content || '';
    
    // Fill content
    if (job.platform === 'X') {
      await chrome.scripting.executeScript({
        target: { tabId: activePublishTab.id },
        func: (text) => {
          const interval = setInterval(() => {
            const editor = document.querySelector('[data-testid="tweetTextarea_0"]') ||
                          document.querySelector('[role="textbox"]');
            if (editor) {
              clearInterval(interval);
              editor.focus();
              document.execCommand('insertText', false, text);
            }
          }, 500);
          setTimeout(() => clearInterval(interval), 10000);
        },
        args: [content],
      });
    } else if (job.platform === 'LINKEDIN') {
      await chrome.scripting.executeScript({
        target: { tabId: activePublishTab.id },
        func: (text) => {
          const startPostBtn = document.querySelector('.share-box-feed-entry__trigger');
          if (startPostBtn) startPostBtn.click();
          
          setTimeout(() => {
            const editor = document.querySelector('.ql-editor') ||
                          document.querySelector('[role="textbox"]');
            if (editor) {
              editor.focus();
              editor.innerHTML = `<p>${text}</p>`;
            }
          }, 1000);
        },
        args: [content],
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Postzzz] Start job error:', error);
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

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Postzzz] Extension installed/updated');
});

console.log('[Postzzz] Background service worker loaded');
