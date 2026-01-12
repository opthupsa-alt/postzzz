/**
 * Postzzz Extension - Background Service Worker
 * Publishing-focused extension for social media automation
 * 
 * Features:
 * - Auto-login from platform
 * - WebSocket connection for real-time job dispatch
 * - Publishing job management
 * - Device registration and heartbeat
 */

// ==================== Load Config ====================
// Try to load config.js first (local dev), then config.production.js
let LEEDZ_CONFIG = null;
try {
  importScripts('config.js');
  console.log('[Postzzz] Config loaded from config.js');
} catch (e1) {
  try {
    importScripts('config.production.js');
    console.log('[Postzzz] Config loaded from config.production.js');
  } catch (e2) {
    console.log('[Postzzz] No config file found, using defaults');
  }
}

// ==================== Default Configuration ====================
const DEFAULT_CONFIG = {
  API_URL: LEEDZ_CONFIG?.API_URL || 'https://leedz-api.onrender.com',
  WEB_URL: LEEDZ_CONFIG?.WEB_URL || 'https://leedz.vercel.app',
  DEBUG_MODE: LEEDZ_CONFIG?.DEBUG_MODE || false,
};

let platformConfig = {
  platformUrl: DEFAULT_CONFIG.WEB_URL,
  apiUrl: DEFAULT_CONFIG.API_URL,
  extensionAutoLogin: true,
  extensionDebugMode: DEFAULT_CONFIG.DEBUG_MODE,
};

console.log('[Postzzz] Using config:', { apiUrl: platformConfig.apiUrl, platformUrl: platformConfig.platformUrl });

// ==================== Storage Keys ====================
const STORAGE_KEYS = {
  AUTH_TOKEN: 'leedz_auth_token',
  USER: 'leedz_user',
  TENANT: 'leedz_tenant',
  PLATFORM_CONFIG: 'leedz_platform_config',
  DEVICE_ID: 'postzzz_device_id',
  SELECTED_CLIENT_ID: 'postzzz_selected_client_id',
  RUNNER_MODE: 'postzzz_runner_mode',
};

// ==================== State ====================
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000;
let heartbeatInterval = null;
let pollingInterval = null;
let isPollingActive = false;

// ==================== Storage Helpers ====================

async function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

async function setStorageData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

async function clearStorageData() {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}

// ==================== API Helpers ====================

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

// ==================== Auth Functions ====================

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
  disconnectWebSocket();
  stopPolling();
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
    console.log('[Postzzz] Token not valid');
    await logout();
    return false;
  }
}

// ==================== Auto-Login from Platform ====================

async function checkPlatformLogin() {
  if (!platformConfig.extensionAutoLogin) {
    return { success: false, reason: 'disabled' };
  }

  try {
    const authState = await getAuthState();
    if (authState.isAuthenticated) {
      const valid = await verifyToken();
      if (valid) {
        return { success: true, alreadyLoggedIn: true };
      }
    }

    const platformUrl = platformConfig.platformUrl;
    let platformTab = await findPlatformTab(platformUrl);
    
    if (!platformTab) {
      platformTab = await chrome.tabs.create({ url: platformUrl, active: false });
      await waitForTabLoad(platformTab.id);
    }

    const result = await injectAndReadPlatformAuth(platformTab.id);
    
    if (result && result.token) {
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
        
        startPolling();
        await connectWebSocket();
        
        return { success: true, user: userData.user || userData };
      }
    }
    
    return { success: false, reason: 'not_logged_in', platformUrl };
  } catch (error) {
    return { success: false, reason: 'error', error: error.message };
  }
}

async function findPlatformTab(platformUrl) {
  const tabs = await chrome.tabs.query({});
  const platformOrigin = new URL(platformUrl).origin;
  
  return tabs.find(tab => {
    try {
      return tab.url && new URL(tab.url).origin === platformOrigin;
    } catch {
      return false;
    }
  });
}

async function waitForTabLoad(tabId, timeout = 10000) {
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
          reject(new Error('Tab load timeout'));
          return;
        }
        
        setTimeout(checkTab, 200);
      } catch (error) {
        reject(error);
      }
    };
    
    checkTab();
  });
}

async function injectAndReadPlatformAuth(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const token = localStorage.getItem('leedz_token') || localStorage.getItem('token');
        const user = localStorage.getItem('leedz_user') || localStorage.getItem('user');
        const tenant = localStorage.getItem('leedz_tenant') || localStorage.getItem('tenant');
        
        return {
          token,
          user: user ? JSON.parse(user) : null,
          tenant: tenant ? JSON.parse(tenant) : null,
        };
      },
    });
    
    return results[0]?.result;
  } catch (error) {
    return null;
  }
}

// ==================== WebSocket ====================

async function connectWebSocket() {
  const authState = await getAuthState();
  if (!authState.isAuthenticated) return;

  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }

  const wsUrl = platformConfig.apiUrl.replace('http', 'ws') + '/ws';
  
  try {
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('[Postzzz] WebSocket connected');
      reconnectAttempts = 0;
      
      // Authenticate
      socket.send(JSON.stringify({
        type: 'AUTH',
        token: authState.token,
      }));
      
      // Start heartbeat
      startHeartbeat();
      broadcastToSidePanel({ type: 'WS_CONNECTED' });
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('[Postzzz] WS message parse error:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('[Postzzz] WebSocket disconnected');
      stopHeartbeat();
      broadcastToSidePanel({ type: 'WS_DISCONNECTED' });
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(connectWebSocket, RECONNECT_DELAY);
      }
    };
    
    socket.onerror = (error) => {
      console.error('[Postzzz] WebSocket error:', error);
    };
  } catch (error) {
    console.error('[Postzzz] WebSocket connection failed:', error);
  }
}

function disconnectWebSocket() {
  stopHeartbeat();
  if (socket) {
    socket.close();
    socket = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'PING' }));
    }
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'PONG':
      break;
      
    case 'JOB_DISPATCH':
      broadcastToSidePanel({ type: 'NEW_JOB', job: data.job });
      break;
      
    case 'JOB_CANCEL':
      broadcastToSidePanel({ type: 'JOB_CANCELLED', jobId: data.jobId });
      break;
      
    default:
      console.log('[Postzzz] Unknown WS message:', data.type);
  }
}

// ==================== Polling ====================

function startPolling() {
  if (isPollingActive) return;
  
  isPollingActive = true;
  pollingInterval = setInterval(pollPendingJobs, 5000);
  pollPendingJobs(); // Initial poll
}

function stopPolling() {
  isPollingActive = false;
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function pollPendingJobs() {
  try {
    const authState = await getAuthState();
    if (!authState.isAuthenticated) return;
    
    const jobs = await apiRequest('/publishing/jobs?status=QUEUED&limit=10');
    
    if (jobs && jobs.length > 0) {
      broadcastToSidePanel({ type: 'PENDING_JOBS', jobs });
    }
  } catch (error) {
    // Silently ignore polling errors
  }
}

// ==================== Side Panel Communication ====================

function broadcastToSidePanel(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Side panel not open
  });
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

        case 'API_REQUEST':
          return await apiRequest(message.endpoint, message.options);

        case 'GET_CURRENT_TAB':
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          return { tab };

        case 'OPEN_SIDE_PANEL_REQUEST':
          try {
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (currentTab?.windowId) {
              await chrome.sidePanel.open({ windowId: currentTab.windowId });
              return { success: true };
            }
            return { success: false, error: 'No active window' };
          } catch (error) {
            return { success: false, error: error.message };
          }

        case 'SYNC_AUTH_FROM_PLATFORM':
          if (message.token && message.user) {
            await setStorageData({
              [STORAGE_KEYS.AUTH_TOKEN]: message.token,
              [STORAGE_KEYS.USER]: message.user,
              [STORAGE_KEYS.TENANT]: message.tenant,
            });
            await connectWebSocket();
            return { success: true };
          }
          return { success: false, error: 'Missing token or user' };

        case 'CONNECT_WEBSOCKET':
          await connectWebSocket();
          return { success: true };

        case 'DISCONNECT_WEBSOCKET':
          disconnectWebSocket();
          return { success: true };

        case 'GET_WS_STATUS':
          return { 
            connected: socket && socket.readyState === WebSocket.OPEN,
            reconnectAttempts,
          };

        case 'CHECK_PLATFORM_LOGIN':
          return await checkPlatformLogin();

        case 'GET_PLATFORM_CONFIG':
          return platformConfig;

        case 'OPEN_PLATFORM':
          const platformTab = await chrome.tabs.create({ url: platformConfig.platformUrl });
          return { success: true, tabId: platformTab.id };

        // ==================== Publishing Runner Messages ====================
        
        case 'GET_DEVICE_ID':
          const deviceData = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
          return { deviceId: deviceData[STORAGE_KEYS.DEVICE_ID] };

        case 'SET_DEVICE_ID':
          await setStorageData({ [STORAGE_KEYS.DEVICE_ID]: message.deviceId });
          return { success: true };

        case 'GET_SELECTED_CLIENT':
          const clientData = await getStorageData([STORAGE_KEYS.SELECTED_CLIENT_ID]);
          return { clientId: clientData[STORAGE_KEYS.SELECTED_CLIENT_ID] };

        case 'SET_SELECTED_CLIENT':
          await setStorageData({ [STORAGE_KEYS.SELECTED_CLIENT_ID]: message.clientId });
          return { success: true };

        case 'GET_RUNNER_MODE':
          const modeData = await getStorageData([STORAGE_KEYS.RUNNER_MODE]);
          return { mode: modeData[STORAGE_KEYS.RUNNER_MODE] || 'ASSIST' };

        case 'SET_RUNNER_MODE':
          await setStorageData({ [STORAGE_KEYS.RUNNER_MODE]: message.mode });
          return { success: true };

        case 'CAPTURE_SCREENSHOT':
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            return { success: true, dataUrl };
          } catch (error) {
            return { success: false, error: error.message };
          }

        case 'EXECUTE_SCRIPT':
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: message.tabId },
              func: new Function('return (' + message.func + ')()'),
            });
            return { success: true, result: results[0]?.result };
          } catch (error) {
            return { success: false, error: error.message };
          }

        // ==================== Runner UI Messages ====================
        
        case 'GET_CLIENTS':
          try {
            const clients = await apiRequest('/clients');
            const selectedData = await getStorageData([STORAGE_KEYS.SELECTED_CLIENT_ID]);
            return { 
              clients: clients || [], 
              selectedClientId: selectedData[STORAGE_KEYS.SELECTED_CLIENT_ID] 
            };
          } catch (error) {
            return { clients: [], error: error.message };
          }

        case 'GET_CLAIMED_JOBS':
          try {
            const jobs = await apiRequest('/publishing/jobs?status=CLAIMED&limit=20');
            return { jobs: jobs || [] };
          } catch (error) {
            return { jobs: [], error: error.message };
          }

        case 'GET_DEVICE_STATUS':
          const devData = await getStorageData([STORAGE_KEYS.DEVICE_ID]);
          return { deviceId: devData[STORAGE_KEYS.DEVICE_ID] };

        case 'REGISTER_DEVICE':
          try {
            const deviceInfo = {
              name: 'Chrome Extension',
              userAgent: navigator.userAgent,
            };
            const device = await apiRequest('/devices/register', {
              method: 'POST',
              body: JSON.stringify(deviceInfo),
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

        default:
          return { error: 'Unknown message type' };
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

// Platform URLs
const PLATFORM_URLS = {
  X: 'https://x.com',
  LINKEDIN: 'https://www.linkedin.com',
  INSTAGRAM: 'https://www.instagram.com',
  FACEBOOK: 'https://www.facebook.com',
};

// Check login status for all platforms
async function checkAllPlatformLogins() {
  const status = {};
  
  for (const [platform, url] of Object.entries(PLATFORM_URLS)) {
    try {
      status[platform] = await checkPlatformLoginStatus(platform, url);
    } catch (error) {
      status[platform] = 'UNKNOWN';
    }
  }
  
  return { status };
}

// Check login status for a specific platform
async function checkPlatformLoginStatus(platform, url) {
  try {
    // Find existing tab or create one
    const tabs = await chrome.tabs.query({ url: `${url}/*` });
    let tab = tabs[0];
    
    if (!tab) {
      // Create tab in background
      tab = await chrome.tabs.create({ url, active: false });
      await waitForTabLoad(tab.id, 15000);
    }
    
    // Execute detection script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectPlatformLogin,
      args: [platform],
    });
    
    return results[0]?.result || 'UNKNOWN';
  } catch (error) {
    console.error(`[Postzzz] Check ${platform} login error:`, error);
    return 'UNKNOWN';
  }
}

// Detection function to run in page context
function detectPlatformLogin(platform) {
  const detectors = {
    X: () => {
      // Check for logged-in indicators on X
      const avatar = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      const loginBtn = document.querySelector('[data-testid="loginButton"]');
      if (avatar) return 'LOGGED_IN';
      if (loginBtn) return 'NEEDS_LOGIN';
      return 'UNKNOWN';
    },
    LINKEDIN: () => {
      // Check for LinkedIn login
      const navProfile = document.querySelector('.global-nav__me-photo');
      const signInBtn = document.querySelector('[data-tracking-control-name="guest_homepage-basic_sign-in-button"]');
      if (navProfile) return 'LOGGED_IN';
      if (signInBtn) return 'NEEDS_LOGIN';
      return 'UNKNOWN';
    },
    INSTAGRAM: () => {
      const avatar = document.querySelector('[data-testid="user-avatar"]') || 
                     document.querySelector('img[data-testid="user-avatar"]');
      const loginForm = document.querySelector('input[name="username"]');
      if (avatar) return 'LOGGED_IN';
      if (loginForm) return 'NEEDS_LOGIN';
      return 'UNKNOWN';
    },
    FACEBOOK: () => {
      const profileLink = document.querySelector('[aria-label="Your profile"]');
      const loginForm = document.querySelector('#email');
      if (profileLink) return 'LOGGED_IN';
      if (loginForm) return 'NEEDS_LOGIN';
      return 'UNKNOWN';
    },
  };
  
  const detector = detectors[platform];
  return detector ? detector() : 'UNKNOWN';
}

// Active job state
let activePublishJob = null;
let activePublishTab = null;

// Start a publishing job
async function startPublishingJob(jobId) {
  try {
    // Get job details from API
    const job = await apiRequest(`/publishing/jobs/${jobId}`);
    if (!job) {
      return { success: false, error: 'Job not found' };
    }
    
    activePublishJob = job;
    
    // Get platform URL
    const platformUrl = PLATFORM_URLS[job.platform];
    if (!platformUrl) {
      return { success: false, error: 'Unsupported platform' };
    }
    
    // Notify UI
    broadcastToSidePanel({ 
      type: 'JOB_STEP_COMPLETED', 
      target: 'runner-ui',
      completedSteps: ['check_login'] 
    });
    
    // Open platform compose page
    const composeUrls = {
      X: 'https://x.com/compose/post',
      LINKEDIN: 'https://www.linkedin.com/feed/',
      INSTAGRAM: 'https://www.instagram.com/',
      FACEBOOK: 'https://www.facebook.com/',
    };
    
    activePublishTab = await chrome.tabs.create({ 
      url: composeUrls[job.platform] || platformUrl,
      active: true 
    });
    
    await waitForTabLoad(activePublishTab.id, 15000);
    
    broadcastToSidePanel({ 
      type: 'JOB_STEP_COMPLETED', 
      target: 'runner-ui',
      completedSteps: ['check_login', 'open_composer'] 
    });
    
    // Get content to post
    const variant = job.post?.variants?.find(v => v.platform === job.platform);
    const content = variant?.caption || job.post?.content || '';
    
    // Fill content based on platform
    await fillPlatformContent(job.platform, content, activePublishTab.id);
    
    broadcastToSidePanel({ 
      type: 'JOB_STEP_COMPLETED', 
      target: 'runner-ui',
      completedSteps: ['check_login', 'open_composer', 'fill_content'] 
    });
    
    // Wait for user confirmation (Assist Mode)
    broadcastToSidePanel({ 
      type: 'JOB_AWAITING_CONFIRM', 
      target: 'runner-ui',
      jobId 
    });
    
    return { success: true };
  } catch (error) {
    console.error('[Postzzz] Start job error:', error);
    return { success: false, error: error.message };
  }
}

// Fill content on platform
async function fillPlatformContent(platform, content, tabId) {
  const fillers = {
    X: async () => {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text) => {
          // Wait for composer and fill
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
    },
    LINKEDIN: async () => {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text) => {
          // Click "Start a post" button first
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
    },
  };
  
  const filler = fillers[platform];
  if (filler) {
    await filler();
  }
}

// Confirm and complete publishing
async function confirmPublishJob(jobId) {
  if (!activePublishJob || activePublishJob.id !== jobId) {
    return { success: false, error: 'No active job' };
  }
  
  try {
    // Capture screenshot as proof
    const screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    
    // Update job status
    await apiRequest(`/publishing/jobs/${jobId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'COMPLETED',
        proofScreenshot: screenshot,
      }),
    });
    
    // Notify UI
    broadcastToSidePanel({ 
      type: 'JOB_COMPLETED', 
      target: 'runner-ui',
      jobId,
      success: true 
    });
    
    activePublishJob = null;
    
    return { success: true };
  } catch (error) {
    console.error('[Postzzz] Confirm publish error:', error);
    return { success: false, error: error.message };
  }
}

// Cancel a publishing job
async function cancelPublishingJob(jobId) {
  try {
    await apiRequest(`/publishing/jobs/${jobId}/cancel`, {
      method: 'POST',
    });
    
    if (activePublishTab) {
      try {
        await chrome.tabs.remove(activePublishTab.id);
      } catch (e) {}
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
    // Only accept messages from our platform
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
          await connectWebSocket();
          startPolling();
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

// ==================== Side Panel Setup ====================

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ==================== Startup ====================

chrome.runtime.onStartup.addListener(async () => {
  console.log('[Postzzz] Extension started');
  await loadLocalConfig();
  
  const authState = await getAuthState();
  if (authState.isAuthenticated) {
    const valid = await verifyToken();
    if (valid) {
      startPolling();
      await connectWebSocket();
    }
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Postzzz] Extension installed/updated');
  await loadLocalConfig();
});

console.log('[Postzzz] Background service worker loaded');
