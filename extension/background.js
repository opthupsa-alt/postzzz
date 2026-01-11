/**
 * Leedz Extension - Background Service Worker
 * Handles authentication, API communication, WebSocket, and side panel management
 * 
 * Features:
 * - Auto-login from platform (reads token from platform's localStorage)
 * - WebSocket connection for real-time job dispatch
 * - Execution Window for Google Maps search
 * - Evidence collection and upload
 */

// ==================== Default Configuration ====================
// الإعدادات الافتراضية - يتم تحديثها من config.js عبر sync-and-start.ps1
const DEFAULT_CONFIG = {
  API_URL: 'http://localhost:3001',
  WEB_URL: 'http://localhost:3000',
  DEBUG_MODE: false,
  SHOW_SEARCH_WINDOW: false
};

// Default config (will be updated from config.js, API, or storage)
let platformConfig = {
  platformUrl: DEFAULT_CONFIG.WEB_URL,
  apiUrl: DEFAULT_CONFIG.API_URL,
  extensionAutoLogin: true,
  extensionDebugMode: DEFAULT_CONFIG.DEBUG_MODE,
  searchMethod: 'GOOGLE_MAPS_REAL',
  searchRateLimit: 10,
  crawlRateLimit: 20,
};

// Load config from config.js file
async function loadLocalConfig() {
  try {
    const configUrl = chrome.runtime.getURL('config.js');
    const response = await fetch(configUrl);
    const text = await response.text();
    
    // Parse LEEDZ_CONFIG from the file
    const match = text.match(/const\s+LEEDZ_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      const configObj = eval('(' + match[1] + ')');
      if (configObj.API_URL) {
        platformConfig.apiUrl = configObj.API_URL;
        DEFAULT_CONFIG.API_URL = configObj.API_URL;
      }
      if (configObj.WEB_URL) {
        platformConfig.platformUrl = configObj.WEB_URL;
        DEFAULT_CONFIG.WEB_URL = configObj.WEB_URL;
      }
      if (configObj.DEBUG_MODE !== undefined) {
        platformConfig.extensionDebugMode = configObj.DEBUG_MODE;
        DEFAULT_CONFIG.DEBUG_MODE = configObj.DEBUG_MODE;
      }
      if (configObj.SHOW_SEARCH_WINDOW !== undefined) {
        DEFAULT_CONFIG.SHOW_SEARCH_WINDOW = configObj.SHOW_SEARCH_WINDOW;
      }
      console.log('[Leedz] Config loaded from config.js:', { 
        apiUrl: platformConfig.apiUrl, 
        platformUrl: platformConfig.platformUrl 
      });
    }
  } catch (error) {
    console.log('[Leedz] Using default config (config.js not found or error):', error.message);
  }
}

// Initialize config on startup
loadLocalConfig();

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'leedz_auth_token',
  USER: 'leedz_user',
  TENANT: 'leedz_tenant',
  PLATFORM_CONFIG: 'leedz_platform_config',
};

// WebSocket state
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000;
let heartbeatInterval = null;
let pollingInterval = null;
let isPollingActive = false;

// Execution Window state
let executionWindowId = null;
let executionTabId = null;

// Search state for visibility control
let showSearchWindow = true; // Set to true temporarily for debugging - change back to false for production

// Search abort control - للتحكم في إيقاف البحث
let currentSearchAborted = false;
let currentJobId = null;

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

// ==================== Platform Config ====================

async function fetchPlatformConfig() {
  try {
    const response = await fetch(`${platformConfig.apiUrl}/api/agent/config`);
    if (response.ok) {
      const data = await response.json();
      if (data.platform) {
        platformConfig = { ...platformConfig, ...data.platform };
        await setStorageData({ [STORAGE_KEYS.PLATFORM_CONFIG]: platformConfig });
        console.log('[Leedz] Platform config updated:', platformConfig);
      }
    }
  } catch (error) {
    console.error('[Leedz] Failed to fetch platform config:', error);
    // Try to load from storage
    const stored = await getStorageData([STORAGE_KEYS.PLATFORM_CONFIG]);
    if (stored[STORAGE_KEYS.PLATFORM_CONFIG]) {
      platformConfig = stored[STORAGE_KEYS.PLATFORM_CONFIG];
    }
  }
  return platformConfig;
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

/**
 * Save search history to database
 * @param {Object} searchData - Search data to save
 */
async function saveSearchHistory(searchData) {
  try {
    const result = await apiRequest('/search-history', {
      method: 'POST',
      body: JSON.stringify(searchData),
    });
    console.log('[Leedz] Search history saved:', result.id);
    return result;
  } catch (error) {
    console.error('[Leedz] Failed to save search history:', error.message);
    throw error;
  }
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
    console.error('Token verification failed:', error);
    await logout();
    return false;
  }
}

// ==================== Auto-Login from Platform ====================

/**
 * Check if user is logged in on the platform and auto-login to extension
 * This works by:
 * 1. Opening the platform URL in a tab (if not already open)
 * 2. Injecting a content script to read localStorage
 * 3. Getting the token and user data
 * 4. Storing in extension's chrome.storage
 */
async function checkPlatformLogin() {
  if (!platformConfig.extensionAutoLogin) {
    console.log('[Leedz] Auto-login disabled');
    return { success: false, reason: 'disabled' };
  }

  try {
    // Check if already authenticated
    const authState = await getAuthState();
    if (authState.isAuthenticated) {
      // Verify token is still valid
      const valid = await verifyToken();
      if (valid) {
        console.log('[Leedz] Already authenticated');
        return { success: true, alreadyLoggedIn: true };
      }
    }

    // Find platform tab or open one
    const platformUrl = platformConfig.platformUrl;
    let platformTab = await findPlatformTab(platformUrl);
    
    if (!platformTab) {
      console.log('[Leedz] Platform not open, opening...');
      platformTab = await openPlatformTab(platformUrl);
      // Wait for page to load
      await waitForTabLoad(platformTab.id);
    }

    // Inject content script to read localStorage
    const result = await injectAndReadPlatformAuth(platformTab.id);
    
    if (result && result.token) {
      // Verify the token with API
      const verifyResponse = await fetch(`${platformConfig.apiUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${result.token}` }
      });
      
      if (verifyResponse.ok) {
        const userData = await verifyResponse.json();
        
        // Store auth data
        await setStorageData({
          [STORAGE_KEYS.AUTH_TOKEN]: result.token,
          [STORAGE_KEYS.USER]: userData.user || userData,
          [STORAGE_KEYS.TENANT]: userData.tenant || result.tenant,
        });
        
        console.log('[Leedz] Auto-login successful');
        
        // Start polling and WebSocket
        startPolling();
        await connectWebSocket();
        
        return { success: true, user: userData.user || userData };
      } else {
        console.log('[Leedz] Platform token invalid');
        return { success: false, reason: 'invalid_token' };
      }
    } else {
      console.log('[Leedz] No token found on platform');
      return { success: false, reason: 'not_logged_in', platformUrl };
    }
  } catch (error) {
    console.error('[Leedz] Auto-login error:', error);
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

async function openPlatformTab(platformUrl) {
  return chrome.tabs.create({
    url: platformUrl,
    active: false, // Don't steal focus
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
        // Read auth data from platform's localStorage
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
    console.error('[Leedz] Failed to read platform auth:', error);
    return null;
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

        case 'API_REQUEST':
          return await apiRequest(message.endpoint, message.options);

        case 'GET_CURRENT_TAB':
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          return { tab };

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
          const platformTab = await openPlatformTab(platformConfig.platformUrl);
          return { success: true, tabId: platformTab.id };

        case 'SEARCH_GOOGLE_MAPS':
          return await searchGoogleMaps(message.query, message.city);

        case 'DEEP_SEARCH':
          // البحث الشامل متعدد الطبقات مع السوشيال ميديا
          return await executeDeepSearch(message.companyData);

        case 'SEARCH_SOCIAL_MEDIA':
          // البحث في السوشيال ميديا فقط
          return await searchSocialMediaOnly(message.query, message.socialLinks);

        case 'GET_SETTINGS':
          // Get extension settings from storage or backend
          try {
            const settingsData = await getStorageData(['leedz_extension_settings']);
            const settings = settingsData.leedz_extension_settings || {
              enableGoogleMaps: true,
              enableGoogleSearch: true,
              enableSocialMedia: false,
              matchThreshold: 90,
              maxResults: 30,
              searchDelay: 3,
              showSearchWindow: false,
              debugMode: false,
            };
            return { settings };
          } catch (error) {
            console.error('[Leedz] Get settings error:', error);
            return { settings: null, error: error.message };
          }

        case 'UPDATE_SETTINGS':
          // Update extension settings
          try {
            await setStorageData({ leedz_extension_settings: message.settings });
            // Update local showSearchWindow variable
            if (message.settings.showSearchWindow !== undefined) {
              showSearchWindow = message.settings.showSearchWindow;
            }
            return { success: true };
          } catch (error) {
            console.error('[Leedz] Update settings error:', error);
            return { success: false, error: error.message };
          }

        case 'STOP_SEARCH':
          // إيقاف البحث الحالي
          console.log('[Leedz] ========== STOPPING SEARCH ==========');
          console.log('[Leedz] Current Job ID:', currentJobId);
          console.log('[Leedz] Execution Window ID:', executionWindowId);
          console.log('[Leedz] Execution Tab ID:', executionTabId);
          
          currentSearchAborted = true;
          
          // إغلاق نافذة البحث أولاً (الأهم)
          if (executionWindowId) {
            console.log('[Leedz] Closing execution window:', executionWindowId);
            try {
              await chrome.windows.remove(executionWindowId);
              console.log('[Leedz] Window closed successfully');
            } catch (e) {
              console.log('[Leedz] Window close error:', e.message);
            }
            executionWindowId = null;
            executionTabId = null;
          } else if (executionTabId) {
            // إذا لم توجد نافذة لكن يوجد تاب
            console.log('[Leedz] Closing execution tab:', executionTabId);
            try {
              await chrome.tabs.remove(executionTabId);
              console.log('[Leedz] Tab closed successfully');
            } catch (e) {
              console.log('[Leedz] Tab close error:', e.message);
            }
            executionTabId = null;
          }
          
          // إكمال الوظيفة
          if (currentJobId) {
            console.log('[Leedz] Marking job as cancelled:', currentJobId);
            await markJobComplete(currentJobId, {
              status: 'CANCELLED',
              message: 'تم إيقاف البحث بواسطة المستخدم',
            });
            broadcastToSidePanel({
              type: 'JOB_COMPLETED',
              jobId: currentJobId,
              results: [],
              savedCount: 0,
              message: 'تم إيقاف البحث',
              cancelled: true,
            });
            currentJobId = null;
          }
          
          console.log('[Leedz] ========== SEARCH STOPPED ==========');
          return { success: true };

        case 'GET_RECENT_SEARCH':
          // Get most recent search from API
          try {
            const recentSearches = await apiRequest('/search-history/recent?limit=1');
            if (recentSearches && recentSearches.length > 0) {
              // Get full details including results
              const fullSearch = await apiRequest(`/search-history/${recentSearches[0].id}`);
              return { success: true, search: fullSearch };
            }
            return { success: false, message: 'No recent searches' };
          } catch (error) {
            console.error('[Leedz] Get recent search error:', error);
            return { success: false, error: error.message };
          }

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      return { error: error.message };
    }
  };

  handleMessage().then(sendResponse);
  return true; // Keep channel open for async response
});

// ==================== WebSocket Functions ====================

async function connectWebSocket() {
  const { [STORAGE_KEYS.AUTH_TOKEN]: token } = await getStorageData([STORAGE_KEYS.AUTH_TOKEN]);
  
  if (!token) {
    console.log('[Leedz] No token, skipping WebSocket connection');
    return;
  }

  if (socket && socket.connected) {
    console.log('[Leedz] WebSocket already connected');
    return;
  }

  try {
    console.log('[Leedz] Connecting to WebSocket...');
    
    // Using native WebSocket with Socket.IO protocol simulation
    const wsHost = new URL(platformConfig.apiUrl).host;
    const wsUrl = `ws://${wsHost}/socket.io/?EIO=4&transport=websocket`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('[Leedz] WebSocket connected');
      reconnectAttempts = 0;
      
      // Send Socket.IO handshake for /agent namespace with auth token
      socket.send('40/agent,{"token":"' + token + '"}');
      
      // Start heartbeat
      startHeartbeat();
      
      // Notify side panel
      broadcastToSidePanel({ type: 'WS_CONNECTED' });
    };
    
    socket.onmessage = (event) => {
      handleWebSocketMessage(event.data);
    };
    
    socket.onclose = (event) => {
      console.log('[Leedz] WebSocket disconnected:', event.code, event.reason);
      stopHeartbeat();
      broadcastToSidePanel({ type: 'WS_DISCONNECTED' });
      
      // Attempt reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[Leedz] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts})`);
        setTimeout(connectWebSocket, RECONNECT_DELAY);
      }
    };
    
    socket.onerror = (error) => {
      console.error('[Leedz] WebSocket error:', error);
    };
    
  } catch (error) {
    console.error('[Leedz] Failed to connect WebSocket:', error);
  }
}

function disconnectWebSocket() {
  if (socket) {
    stopHeartbeat();
    socket.close();
    socket = null;
  }
  reconnectAttempts = 0;
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Socket.IO ping
      socket.send('2');
    }
  }, 25000); // Ping every 25 seconds
}

// Independent polling system
function startPolling() {
  if (isPollingActive) return;
  isPollingActive = true;
  
  console.log('[Leedz] Starting job polling...');
  
  // Poll immediately
  pollPendingJobs();
  
  // Then poll every 3 seconds
  pollingInterval = setInterval(async () => {
    await pollPendingJobs();
  }, 3000);
  
  broadcastToSidePanel({ type: 'POLLING_STARTED' });
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isPollingActive = false;
  broadcastToSidePanel({ type: 'POLLING_STOPPED' });
}

async function pollPendingJobs() {
  // Don't poll if already executing a job
  if (isExecutingJob) {
    console.log('[Leedz] Skipping poll - job in progress');
    return;
  }
  
  try {
    const { [STORAGE_KEYS.AUTH_TOKEN]: token } = await getStorageData([STORAGE_KEYS.AUTH_TOKEN]);
    if (!token) return;
    
    const response = await apiRequest('/api/agent/jobs/pending');
    const { jobs } = response;
    
    if (jobs && jobs.length > 0) {
      console.log('[Leedz] Found pending jobs:', jobs.length);
      
      // Only process the first unprocessed job
      for (const job of jobs) {
        // Skip if we've already processed this job
        if (processedJobIds.has(job.jobId) || activeJobs.has(job.jobId)) {
          console.log('[Leedz] Skipping already processed job:', job.jobId);
          continue;
        }
        
        // Mark as processed immediately to prevent duplicates
        processedJobIds.add(job.jobId);
        
        console.log('[Leedz] Processing job from polling:', job.jobId, job.type);
        await handleJobDispatch(job);
        
        // Only process one job at a time
        break;
      }
    }
  } catch (error) {
    console.debug('[Leedz] Poll failed:', error.message);
  }
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function handleWebSocketMessage(data) {
  // Socket.IO message parsing
  if (data === '2') {
    // Ping - respond with pong
    socket.send('3');
    return;
  }
  
  if (data === '3') {
    // Pong received
    return;
  }
  
  if (data.startsWith('40')) {
    // Connection acknowledgment (may include namespace like "40/agent,")
    console.log('[Leedz] WebSocket namespace connected');
    return;
  }
  
  if (data.startsWith('41')) {
    // Disconnect packet
    console.log('[Leedz] Server requested disconnect');
    return;
  }
  
  if (data.startsWith('44')) {
    // Error packet
    console.error('[Leedz] WebSocket error packet:', data);
    return;
  }
  
  if (data.startsWith('42')) {
    // Event message - may include namespace like "42/agent,["event", data]"
    try {
      let jsonStr = data.substring(2);
      
      // Remove namespace prefix if present (e.g., "/agent,")
      if (jsonStr.startsWith('/')) {
        const commaIndex = jsonStr.indexOf(',');
        if (commaIndex !== -1) {
          jsonStr = jsonStr.substring(commaIndex + 1);
        }
      }
      
      const [event, payload] = JSON.parse(jsonStr);
      handleServerEvent(event, payload);
    } catch (e) {
      console.error('[Leedz] Failed to parse WebSocket message:', e, 'Data:', data.substring(0, 50));
    }
  }
}

function handleServerEvent(event, payload) {
  console.log('[Leedz] Server event:', event, payload);
  
  switch (event) {
    case 'connected':
      console.log('[Leedz] Authenticated with server:', payload);
      broadcastToSidePanel({ type: 'WS_AUTHENTICATED', payload });
      break;
      
    case 'job_dispatch':
    case 'job:new':
    case 'job:available':
      console.log('[Leedz] Job received:', payload);
      handleJobDispatch(payload);
      break;
      
    case 'job_cancel':
    case 'job:cancel':
      console.log('[Leedz] Job cancelled:', payload);
      handleJobCancel(payload);
      break;
      
    case 'config_update':
      console.log('[Leedz] Config update:', payload);
      break;
      
    case 'error':
      console.error('[Leedz] Server error:', payload);
      broadcastToSidePanel({ type: 'WS_ERROR', payload });
      break;
      
    default:
      console.log('[Leedz] Unknown event:', event);
  }
}

function sendToServer(event, data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = '42' + JSON.stringify([event, data]);
    socket.send(message);
  } else {
    console.warn('[Leedz] Cannot send - WebSocket not connected');
  }
}

// ==================== Job Handling ====================

const activeJobs = new Map();
const processedJobIds = new Set(); // Track all jobs we've ever processed to prevent duplicates
let isExecutingJob = false; // Prevent concurrent job execution

async function handleJobDispatch(payload) {
  // Handle both formats: { jobPlan: {...} } or direct { jobId, type, context }
  const jobPlan = payload.jobPlan || payload;
  
  // Prevent duplicate processing
  if (activeJobs.has(jobPlan.jobId) || isExecutingJob) {
    console.log('[Leedz] Skipping duplicate or concurrent job:', jobPlan.jobId);
    return;
  }
  
  console.log('[Leedz] Received job:', jobPlan.jobId, jobPlan.type);
  
  // Mark as processing
  isExecutingJob = true;
  processedJobIds.add(jobPlan.jobId);
  
  // Store job
  activeJobs.set(jobPlan.jobId, {
    plan: jobPlan,
    status: 'received',
    startedAt: Date.now(),
  });
  
  // Acknowledge job receipt via HTTP API (more reliable than WebSocket)
  try {
    await apiRequest(`/api/agent/jobs/${jobPlan.jobId}/ack`, {
      method: 'POST',
      headers: { 'X-Agent-Id': 'extension' },
    });
    console.log('[Leedz] Job acknowledged via API');
  } catch (e) {
    console.warn('[Leedz] Failed to ack job via API:', e.message);
    // Also try WebSocket
    sendToServer('job:ack', { jobId: jobPlan.jobId, agentId: 'extension' });
  }
  
  // Notify side panel
  broadcastToSidePanel({ type: 'JOB_RECEIVED', payload: jobPlan });
  
  // Execute job based on type
  try {
    await executeJob(jobPlan);
  } finally {
    isExecutingJob = false;
    activeJobs.delete(jobPlan.jobId);
  }
}

async function handleJobCancel(payload) {
  const { jobId, reason } = payload;
  
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = 'cancelled';
    activeJobs.delete(jobId);
    console.log('[Leedz] Job cancelled:', jobId, reason);
  }
}

async function executeJob(jobPlan) {
  console.log('[Leedz] Executing job:', jobPlan.jobId, 'type:', jobPlan.type);
  
  const job = activeJobs.get(jobPlan.jobId);
  if (!job) return;
  
  job.status = 'running';
  
  try {
    // Execute based on job type
    if (jobPlan.type === 'GOOGLE_MAPS_SEARCH' || 
        (jobPlan.type === 'SEARCH' && jobPlan.context?.connector === 'google_maps')) {
      await executeGoogleMapsSearch(jobPlan);
    } else if (jobPlan.type === 'google_maps') {
      await executeGoogleMapsSearch(jobPlan);
    } else {
      // Default: execute steps sequentially
      const steps = jobPlan.steps || [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await updateJobProgress(jobPlan.jobId, Math.round(((i + 1) / steps.length) * 100), `Executing step ${i + 1}: ${step.action}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await markJobComplete(jobPlan.jobId, {
        status: 'SUCCESS',
        stepsCompleted: steps.length,
        stepsTotal: steps.length,
        duration: Date.now() - job.startedAt,
      });
    }
  } catch (error) {
    console.error('[Leedz] Job execution error:', error);
    await markJobComplete(jobPlan.jobId, {
      status: 'FAILED',
      error: error.message,
    });
  }
}

// Helper to update job progress via HTTP API
async function updateJobProgress(jobId, progress, message) {
  try {
    await apiRequest(`/api/agent/jobs/${jobId}/progress`, {
      method: 'POST',
      headers: { 'X-Agent-Id': 'extension' },
      body: JSON.stringify({ progress, message }),
    });
  } catch (e) {
    console.warn('[Leedz] Failed to update progress via API:', e.message);
    sendToServer('job:progress', { jobId, agentId: 'extension', progress, message });
  }
}

// Helper to mark job as complete via HTTP API
async function markJobComplete(jobId, output) {
  try {
    await apiRequest(`/api/agent/jobs/${jobId}/done`, {
      method: 'POST',
      headers: { 'X-Agent-Id': 'extension' },
      body: JSON.stringify({ output }),
    });
    console.log('[Leedz] Job marked complete via API');
  } catch (e) {
    console.warn('[Leedz] Failed to complete job via API:', e.message);
    sendToServer('job:done', { jobId, agentId: 'extension', output });
  }
}

// ==================== Execution Window ====================

async function ensureExecutionWindow() {
  // Check if existing window is still valid
  if (executionWindowId) {
    try {
      const win = await chrome.windows.get(executionWindowId);
      if (win) {
        // Bring window to front if showing
        if (showSearchWindow) {
          await chrome.windows.update(executionWindowId, { focused: true, state: 'normal' });
        }
        return executionWindowId;
      }
    } catch {
      executionWindowId = null;
      executionTabId = null;
    }
  }
  
  // Create new window - visibility controlled by showSearchWindow flag
  const windowConfig = showSearchWindow 
    ? {
        type: 'normal',
        focused: true,
        width: 1200,
        height: 800,
        state: 'normal',
      }
    : {
        type: 'normal',
        focused: false,
        width: 1200,
        height: 800,
        left: -2000,
        top: -2000,
        state: 'minimized',
      };
  
  console.log('[Leedz] Creating window with config:', windowConfig);
  const window = await chrome.windows.create(windowConfig);
  
  executionWindowId = window.id;
  
  console.log('[Leedz] Created execution window:', executionWindowId, 'visible:', showSearchWindow);
  return executionWindowId;
}

async function createExecutionTab(url) {
  const windowId = await ensureExecutionWindow();
  
  // Close any existing execution tab first to avoid multiple tabs
  if (executionTabId) {
    try {
      await chrome.tabs.remove(executionTabId);
    } catch (e) {
      // Tab might already be closed
    }
    executionTabId = null;
  }
  
  const tab = await chrome.tabs.create({
    windowId,
    url,
    active: true, // Make tab active so it loads properly
  });
  
  executionTabId = tab.id;
  return tab;
}

async function closeExecutionTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
    if (tabId === executionTabId) {
      executionTabId = null;
    }
  } catch (error) {
    console.error('[Leedz] Failed to close tab:', error);
  }
}

// Close the execution window completely
async function closeExecutionWindow() {
  if (executionWindowId) {
    try {
      await chrome.windows.remove(executionWindowId);
    } catch (e) {
      // Window might already be closed
    }
    executionWindowId = null;
    executionTabId = null;
  }
}

// ==================== Google Maps Search (Real Browser) ====================

// Timing configuration for performance optimization (OPTIMIZED)
const TIMING = {
  PAGE_LOAD_TIMEOUT: 15000,     // Max wait for page load (reduced from 20000)
  RESULTS_WAIT: 2000,           // Wait for results to render (reduced from 4000)
  DETAILS_WAIT: 1500,           // Wait for details to load (reduced from 2500)
  SCROLL_DELAY: 600,            // Delay between scrolls (reduced from 1000)
  RETRY_BASE_DELAY: 1500,       // Base delay for retries (reduced from 2000)
};

// Retry configuration
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  DELAY_MULTIPLIER: 1.5,
};

// ==================== Company Name Validation ====================

/**
 * التحقق من جودة اسم الشركة قبل إرسالها للتحليل
 * يمنع إرسال أسماء غير صالحة أو عشوائية
 */
function validateCompanyName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, reason: 'الاسم فارغ' };
  }

  const trimmed = name.trim();

  // التحقق من الطول
  if (trimmed.length < 2) {
    return { valid: false, reason: 'الاسم قصير جداً' };
  }

  if (trimmed.length > 150) {
    return { valid: false, reason: 'الاسم طويل جداً' };
  }

  // التحقق من الأحرف الغريبة (السماح بالعربية والإنجليزية والأرقام والرموز الشائعة)
  const hasWeirdChars = /[^\w\s\u0600-\u06FF\u0750-\u077F\-&.,()'"\/\\:]+/g.test(trimmed);
  if (hasWeirdChars) {
    // تنظيف الاسم بدلاً من الرفض
    const cleaned = trimmed.replace(/[^\w\s\u0600-\u06FF\u0750-\u077F\-&.,()'"\/\\:]+/g, '').trim();
    if (cleaned.length < 2) {
      return { valid: false, reason: 'الاسم يحتوي على أحرف غير صالحة' };
    }
    return { valid: true, cleaned };
  }

  // التحقق من أن الاسم ليس مجرد أرقام
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, reason: 'الاسم لا يمكن أن يكون أرقاماً فقط' };
  }

  // التحقق من أن الاسم يحتوي على كلمات حقيقية
  const words = trimmed.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) {
    return { valid: false, reason: 'الاسم لا يحتوي على كلمات صالحة' };
  }

  // التحقق من أن الاسم ليس URL أو بريد إلكتروني
  if (/^https?:\/\//i.test(trimmed) || /@/.test(trimmed)) {
    return { valid: false, reason: 'الاسم يبدو كـ URL أو بريد إلكتروني' };
  }

  return { valid: true };
}

/**
 * تنظيف اسم الشركة من الأحرف الزائدة
 */
function cleanCompanyName(name) {
  if (!name) return '';
  
  return name
    .trim()
    // إزالة الأحرف الغريبة
    .replace(/[^\w\s\u0600-\u06FF\u0750-\u077F\-&.,()'"\/\\:]+/g, '')
    // إزالة المسافات المتعددة
    .replace(/\s+/g, ' ')
    // إزالة الأقواس الفارغة
    .replace(/\(\s*\)/g, '')
    .trim();
}

// ==================== Smart Matcher (Inline) ====================
const MATCH_THRESHOLD = 90; // الحد الأدنى للقبول

/**
 * خوارزمية التطابق الذكية
 */
function calculateSmartMatch(searchQuery, result) {
  const factors = [];
  let totalScore = 0;
  let totalWeight = 0;

  // تطبيع النص
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[\u064B-\u065F]/g, '') // إزالة التشكيل
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Levenshtein distance
  const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
    }
    return matrix[b.length][a.length];
  };

  // 1. تطابق الاسم (50%)
  const queryName = searchQuery.name || searchQuery.query || '';
  const resultName = result.name || '';
  const q = normalize(queryName);
  const n = normalize(resultName);
  
  let nameScore = 0;
  if (q && n) {
    if (q === n) nameScore = 100;
    else if (n.includes(q) || q.includes(n)) nameScore = 95;
    else {
      const dist = levenshtein(q, n);
      const maxLen = Math.max(q.length, n.length);
      nameScore = Math.round(((maxLen - dist) / maxLen) * 100);
      
      // تطابق الكلمات
      const qWords = q.split(' ').filter(w => w.length > 1);
      const nWords = n.split(' ').filter(w => w.length > 1);
      let matchedWords = 0;
      for (const qw of qWords) {
        for (const nw of nWords) {
          if (nw.includes(qw) || qw.includes(nw)) { matchedWords++; break; }
        }
      }
      const wordScore = qWords.length > 0 ? Math.round((matchedWords / qWords.length) * 100) : 0;
      nameScore = Math.max(nameScore, wordScore);
    }
  }
  factors.push({ factor: 'name', score: nameScore, weight: 0.5 });
  totalScore += nameScore * 0.5;
  totalWeight += 0.5;

  // 2. تطابق المدينة (25%)
  if (searchQuery.city && result.address) {
    const cityNorm = normalize(searchQuery.city);
    const addrNorm = normalize(result.address);
    let cityScore = addrNorm.includes(cityNorm) ? 100 : 30;
    factors.push({ factor: 'city', score: cityScore, weight: 0.25 });
    totalScore += cityScore * 0.25;
    totalWeight += 0.25;
  }

  // 3. وجود معلومات الاتصال (25%)
  let contactScore = 0;
  if (result.phone) contactScore += 40;
  if (result.website) contactScore += 30;
  if (result.email) contactScore += 20;
  if (result.address) contactScore += 10;
  contactScore = Math.min(contactScore, 100);
  factors.push({ factor: 'contact', score: contactScore, weight: 0.25 });
  totalScore += contactScore * 0.25;
  totalWeight += 0.25;

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight * 100) : 0;

  return {
    totalScore: finalScore,
    isMatch: finalScore >= MATCH_THRESHOLD,
    threshold: MATCH_THRESHOLD,
    factors,
  };
}

/**
 * فلترة النتائج حسب التطابق الذكي
 */
function filterResultsBySmartMatch(searchQuery, results, threshold = MATCH_THRESHOLD) {
  return results
    .map(result => {
      const match = calculateSmartMatch(searchQuery, result);
      return { ...result, matchScore: match.totalScore, matchDetails: match };
    })
    .filter(r => r.matchScore >= threshold)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Simple delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay to avoid detection patterns
 */
function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
}

/**
 * Execute function with retry logic
 */
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
    baseDelay = TIMING.RETRY_BASE_DELAY,
    delayMultiplier = RETRY_CONFIG.DELAY_MULTIPLIER,
    onRetry = null,
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delayMs = baseDelay * Math.pow(delayMultiplier, attempt - 1);
      console.log(`[Leedz Retry] Attempt ${attempt} failed, retrying in ${delayMs}ms:`, error.message);
      
      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }
      
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Wait for results to appear in the page using MutationObserver
 * More efficient than fixed setTimeout
 */
async function waitForResults(tabId, timeout = 10000) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [timeout],
      func: (timeoutMs) => {
        return new Promise((resolve) => {
          // Check if results already exist
          const existingResults = document.querySelectorAll('a[href*="/maps/place/"]');
          if (existingResults.length > 0) {
            resolve({ found: true, count: existingResults.length });
            return;
          }
          
          let resolved = false;
          
          const observer = new MutationObserver(() => {
            if (resolved) return;
            const results = document.querySelectorAll('a[href*="/maps/place/"]');
            if (results.length > 0) {
              resolved = true;
              observer.disconnect();
              resolve({ found: true, count: results.length });
            }
          });
          
          observer.observe(document.body, { 
            childList: true, 
            subtree: true 
          });
          
          // Timeout fallback
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              observer.disconnect();
              const results = document.querySelectorAll('a[href*="/maps/place/"]');
              resolve({ found: results.length > 0, count: results.length });
            }
          }, timeoutMs);
        });
      },
    });
    
    return results[0]?.result || { found: false, count: 0 };
  } catch (error) {
    console.error('[Leedz] waitForResults error:', error);
    return { found: false, count: 0 };
  }
}

/**
 * Search Google Maps with two modes:
 * - SINGLE: Find one specific company by name (precise match)
 * - BULK: Find multiple companies in a category (up to maxResults)
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.query - Company name or category
 * @param {string} params.city - City name
 * @param {string} params.country - Country name or code
 * @param {string} params.searchType - 'SINGLE' or 'BULK'
 * @param {number} params.maxResults - Max results for BULK search
 */
async function searchGoogleMaps({ query, city, country, searchType = 'BULK', maxResults = 30, onProgress, originalQuery = null }) {
  // حفظ الاسم الأصلي للاستخدام في جميع الخطوات
  const searchOriginalQuery = originalQuery || query;
  
  console.log('[Leedz] ========== STARTING GOOGLE MAPS SEARCH ==========');
  console.log('[Leedz] Query:', query);
  console.log('[Leedz] Original Query (for all steps):', searchOriginalQuery);
  console.log('[Leedz] City:', city);
  console.log('[Leedz] Country:', country);
  console.log('[Leedz] Type:', searchType);
  console.log('[Leedz] Max Results:', maxResults);
  
  // Build precise search query
  let searchQuery;
  
  if (searchType === 'SINGLE') {
    // For SINGLE search, use quotes to search for exact company name
    searchQuery = `"${query}"`;
    if (city) searchQuery += ` ${city}`;
    if (country) searchQuery += ` ${country}`;
  } else {
    // For BULK search, search for activity/category
    searchQuery = query;
    if (city) searchQuery += ` ${city}`;
    if (country) searchQuery += ` ${country}`;
  }
  
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
  console.log('[Leedz] Search URL:', searchUrl);
  
  let tab = null;
  
  // Wrap the main search logic with retry
  return await withRetry(async (attempt) => {
    console.log(`[Leedz] Search attempt ${attempt}...`);
    
    try {
      // التحقق من إيقاف البحث قبل البدء
      if (currentSearchAborted) {
        console.log('[Leedz] Search aborted before starting');
        return [];
      }
      
      // Step 1: Create tab in execution window
      if (onProgress) onProgress(15, 'جاري فتح خرائط جوجل...');
      tab = await createExecutionTab(searchUrl);
      console.log('[Leedz] Tab created:', tab.id);
      
      // Step 2: Wait for page to load with extended timeout
      if (onProgress) onProgress(25, 'جاري تحميل الصفحة...');
      await waitForTabLoad(tab.id, TIMING.PAGE_LOAD_TIMEOUT);
      console.log('[Leedz] Tab loaded');
      
      // التحقق من إيقاف البحث
      if (currentSearchAborted) {
        console.log('[Leedz] Search aborted after page load');
        return [];
      }
      
      // Step 3: Wait for results using MutationObserver (more efficient)
      if (onProgress) onProgress(35, 'جاري انتظار ظهور النتائج...');
      const waitResult = await waitForResults(tab.id, 8000);
      console.log('[Leedz] Results wait result:', waitResult);
      
      // التحقق من إيقاف البحث
      if (currentSearchAborted) {
        console.log('[Leedz] Search aborted after waiting for results');
        return [];
      }
      
      // Additional wait for DOM stability
      await delay(TIMING.RESULTS_WAIT);
      
      // Step 4: Scroll to load more results (for BULK search)
      const targetResults = searchType === 'SINGLE' ? 10 : maxResults;
      if (searchType === 'BULK' && maxResults > 10) {
        if (onProgress) onProgress(45, 'جاري تحميل المزيد من النتائج...');
        await scrollForMoreResults(tab.id, targetResults);
      }
      
      // التحقق من إيقاف البحث
      if (currentSearchAborted) {
        console.log('[Leedz] Search aborted before extraction');
        return [];
      }
      
      // Step 5: Extract results with retry
      if (onProgress) onProgress(60, 'جاري استخراج البيانات...');
      let results = await extractGoogleMapsResults(tab.id, targetResults, searchType === 'SINGLE' ? query : null);
      
      // If no results on first try, wait a bit more and retry extraction
      if (results.length === 0) {
        console.log('[Leedz] No results on first extraction, waiting and retrying...');
        await delay(2000);
        results = await extractGoogleMapsResults(tab.id, targetResults, searchType === 'SINGLE' ? query : null);
      }
      
      console.log('[Leedz] ========== EXTRACTION COMPLETE ==========');
      console.log('[Leedz] Total results extracted:', results.length);
      
      // For SINGLE search, get detailed info for best match
      if (searchType === 'SINGLE' && results.length > 0) {
        results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        const bestMatch = results[0];
        console.log('[Leedz] Best match:', bestMatch.name, 'Score:', bestMatch.matchScore);
        
        // التحقق من أن النتيجة تتطابق مع الاسم الأصلي (الحد الأدنى 60%)
        const MIN_MATCH_SCORE = 60;
        if (!bestMatch.matchScore || bestMatch.matchScore < MIN_MATCH_SCORE) {
          console.log('[Leedz] ========== MAPS RESULT NOT MATCHING ==========');
          console.log('[Leedz] Best match score:', bestMatch.matchScore, '< ', MIN_MATCH_SCORE);
          console.log('[Leedz] Maps result name:', bestMatch.name);
          console.log('[Leedz] Original query:', searchOriginalQuery);
          console.log('[Leedz] Will skip Maps and search Google directly with original query');
          
          // ========== البحث في Google مباشرة بالاسم الأصلي ==========
          if (onProgress) onProgress(70, 'لم يتم العثور على تطابق، جاري البحث في جوجل...');
          
          try {
            // البحث في Google بالاسم الأصلي
            console.log('[Leedz] Starting Google Search with original query:', searchOriginalQuery);
            const googleSearchResults = await searchGoogle({
              query: searchOriginalQuery,
              city,
              tabId: tab.id,
            });
            
            console.log('[Leedz] Google Search results:', googleSearchResults);
            
            console.log('[Leedz] ========== GOOGLE SEARCH RESULTS ==========');
            console.log('[Leedz] Official Website:', googleSearchResults?.officialWebsite);
            console.log('[Leedz] Social Links:', googleSearchResults?.socialLinks);
            console.log('[Leedz] Social Links Count:', Object.keys(googleSearchResults?.socialLinks || {}).length);
            console.log('[Leedz] ============================================');
            
            // حتى لو لم نجد موقع أو سوشيال، نكمل البحث ونحفظ النتيجة بالاسم الأصلي
            const hasWebsite = !!googleSearchResults?.officialWebsite;
            const hasSocial = Object.keys(googleSearchResults?.socialLinks || {}).length > 0;
            
            console.log('[Leedz] Has Website:', hasWebsite);
            console.log('[Leedz] Has Social:', hasSocial);
            
            // نكمل دائماً حتى لو لم نجد شيء - على الأقل نحفظ الاسم
            if (true) { // نكمل دائماً
              // وجدنا معلومات من جوجل - نبني نتيجة جديدة بالاسم الأصلي
              let googleResult = {
                name: searchOriginalQuery,
                originalSearchQuery: searchOriginalQuery,
                website: googleSearchResults.officialWebsite,
                socialLinks: googleSearchResults.socialLinks || {},
                source: 'GOOGLE_SEARCH',
                matchScore: 80,
              };
              
              console.log('[Leedz] Website to scrape:', googleResult.website);
              
              // فحص الموقع إذا وجدناه
              if (googleResult.website) {
                console.log('[Leedz] ========== STARTING WEBSITE SCRAPE ==========');
                console.log('[Leedz] Scraping website:', googleResult.website);
                if (onProgress) onProgress(80, 'جاري فحص الموقع الإلكتروني...');
                try {
                  const websiteData = await scrapeWebsite(googleResult.website, tab.id);
                  console.log('[Leedz] Website scrape result:', websiteData);
                  if (websiteData) {
                    googleResult.email = websiteData.emails?.[0];
                    googleResult.allEmails = websiteData.emails || [];
                    googleResult.phone = websiteData.phones?.[0];
                    googleResult.allPhones = websiteData.phones || [];
                    googleResult.description = websiteData.description;
                    googleResult.address = websiteData.address;
                    // دمج روابط السوشيال من الموقع
                    if (websiteData.socialLinks) {
                      googleResult.socialLinks = { ...googleResult.socialLinks, ...websiteData.socialLinks };
                    }
                    console.log('[Leedz] Website data extracted:', websiteData);
                  }
                } catch (e) {
                  console.error('[Leedz] Website scrape error:', e);
                }
              }
              
              // فحص السوشيال ميديا
              console.log('[Leedz] ========== CHECKING SOCIAL LINKS ==========');
              console.log('[Leedz] Social links to scrape:', googleResult.socialLinks);
              console.log('[Leedz] Number of social links:', Object.keys(googleResult.socialLinks).length);
              
              if (Object.keys(googleResult.socialLinks).length > 0) {
                console.log('[Leedz] ========== STARTING SOCIAL SCRAPE ==========');
                if (onProgress) onProgress(90, 'جاري تحليل حسابات التواصل الاجتماعي...');
                try {
                  const socialData = await scrapeSocialProfiles(googleResult.socialLinks, tab.id);
                  console.log('[Leedz] Social scrape result:', socialData);
                  if (socialData) {
                    googleResult.socialProfiles = socialData.profiles || socialData;
                    googleResult.totalFollowers = socialData.totalFollowers;
                    googleResult.latestSocialActivity = socialData.latestActivity;
                    console.log('[Leedz] Social data extracted:', socialData);
                  }
                } catch (e) {
                  console.error('[Leedz] Social scrape error:', e);
                }
              } else {
                console.log('[Leedz] No social links to scrape');
              }
              
              console.log('[Leedz] Created result from Google Search:', googleResult);
              return [googleResult];
            }
          } catch (googleError) {
            console.error('[Leedz] Google Search failed:', googleError);
            // حتى في حالة الخطأ، نرجع نتيجة بالاسم الأصلي
            return [{
              name: searchOriginalQuery,
              originalSearchQuery: searchOriginalQuery,
              source: 'GOOGLE_SEARCH_FALLBACK',
              matchScore: 50,
            }];
          }
        }
        
        // If we have a source URL, navigate to it to get full details
        if (bestMatch.sourceUrl && bestMatch.sourceUrl.includes('/maps/place/')) {
          if (onProgress) onProgress(70, 'جاري استخراج التفاصيل الكاملة...');
          
          try {
            // Navigate to the place page
            await chrome.tabs.update(tab.id, { url: bestMatch.sourceUrl });
            await waitForTabLoad(tab.id, 15000);
            await delay(TIMING.DETAILS_WAIT);
            
            // Extract detailed info with retry
            let details = await extractPlaceDetails(tab.id);
            
            // If no phone/website found, wait a bit more and retry
            if (!details.phone && !details.website) {
              console.log('[Leedz] No contact info found, retrying extraction...');
              await delay(1500);
              details = await extractPlaceDetails(tab.id);
            }
            
            console.log('[Leedz] Detailed info extracted:', details);
            
            // Merge details with best match
            let enrichedResult = {
              ...bestMatch,
              name: details.name || bestMatch.name,
              phone: details.phone || bestMatch.phone,
              website: details.website || bestMatch.website,
              email: details.email || null,
              address: details.address || bestMatch.address,
              rating: details.rating || bestMatch.rating,
              reviews: details.reviews || bestMatch.reviews,
              type: details.category || bestMatch.type,
              hours: details.hours,
              detailsExtracted: true,
            };
            
            // التحقق من إيقاف البحث
            if (currentSearchAborted) {
              console.log('[Leedz] Search aborted before Google Search');
              return [];
            }
            
            // Layer 2: Google Search for additional info (website, social links)
            // نبحث دائماً للحصول على أكبر قدر من المعلومات
            // نستخدم الاسم الأصلي (searchOriginalQuery) وليس اسم من Maps
            console.log('[Leedz] Layer 2: Starting Google Search with original query:', searchOriginalQuery);
            if (onProgress) onProgress(80, 'جاري البحث عن معلومات إضافية...');
            
            let googleSearchResults = { socialLinks: {} };
            try {
              googleSearchResults = await searchGoogle({
                query: searchOriginalQuery, // استخدام الاسم الأصلي دائماً
                city,
                tabId: tab.id,
              });
              
              console.log('[Leedz] Google Search results:', googleSearchResults);
              
              // Merge with Google Search results
              enrichedResult = mergeSearchResults(enrichedResult, googleSearchResults);
            } catch (gsError) {
              console.error('[Leedz] Google Search failed:', gsError);
            }
            
            // التحقق من إيقاف البحث
            if (currentSearchAborted) {
              console.log('[Leedz] Search aborted before Website Scraping');
              return [];
            }
            
            // Layer 3: Website Deep Scraping - دائماً نفحص الموقع
            console.log('[Leedz] Layer 3: Website Deep Scraping...');
            let websiteData = null;
            const websiteUrl = enrichedResult.website || googleSearchResults.officialWebsite;
            
            console.log('[Leedz] Website URL to scrape:', websiteUrl);
            
            if (websiteUrl) {
              if (onProgress) onProgress(85, 'جاري فحص الموقع الإلكتروني...');
              
              try {
                console.log('[Leedz] >>> STARTING WEBSITE SCRAPE:', websiteUrl);
                websiteData = await scrapeWebsite(websiteUrl, tab.id);
                console.log('[Leedz] <<< WEBSITE SCRAPE COMPLETE:', websiteData);
              } catch (wsError) {
                console.error('[Leedz] Website scraping error:', wsError);
              }
            } else {
              console.log('[Leedz] No website URL found to scrape');
            }
            
            // التحقق من إيقاف البحث
            if (currentSearchAborted) {
              console.log('[Leedz] Search aborted before Social Media Scraping');
              return [];
            }
            
            // Layer 4: Social Media Scraping
            // جمع روابط السوشيال من جميع المصادر
            const allSocialLinks = {
              ...(googleSearchResults.socialLinks || {}),
              ...(websiteData?.socialLinks || {}),
            };
            const socialPlatforms = Object.keys(allSocialLinks);
            const socialProfiles = {};
            
            if (socialPlatforms.length > 0) {
              console.log('[Leedz] Layer 4: Social Media Scraping');
              console.log('[Leedz] Found social links:', socialPlatforms);
              
              if (onProgress) onProgress(90, 'جاري استخراج بيانات السوشيال ميديا...');
              
              for (const platform of socialPlatforms) {
                const url = allSocialLinks[platform];
                if (!url) continue;
                
                try {
                  console.log(`[Leedz] Scraping ${platform}: ${url}`);
                  const socialData = await scrapeSocialProfile(platform, url);
                  if (socialData) {
                    socialProfiles[platform] = socialData;
                    console.log(`[Leedz] ${platform} data extracted:`, socialData);
                  }
                } catch (socialError) {
                  console.error(`[Leedz] ${platform} scraping error:`, socialError);
                }
              }
            }
            
            // Layer 5: Data Validation & Merge
            console.log('[Leedz] Layer 5: Data Validation & Merge');
            if (onProgress) onProgress(95, 'جاري دمج وتحليل البيانات...');
            
            enrichedResult = validateAndMergeAllData(enrichedResult, websiteData, socialProfiles);
            enrichedResult.socialLinks = allSocialLinks;
            
            // حفظ الاسم الأصلي في النتيجة للبحث SINGLE
            if (searchType === 'SINGLE') {
              enrichedResult.originalSearchQuery = searchOriginalQuery;
            }
            
            return [enrichedResult];
          } catch (detailError) {
            console.error('[Leedz] Failed to get detailed info:', detailError);
            // حفظ الاسم الأصلي حتى في حالة الخطأ
            if (searchType === 'SINGLE') {
              bestMatch.originalSearchQuery = searchOriginalQuery;
            }
            return [bestMatch];
          }
        }
        
        // حفظ الاسم الأصلي في النتيجة للبحث SINGLE
        if (searchType === 'SINGLE') {
          bestMatch.originalSearchQuery = searchOriginalQuery;
        }
        return [bestMatch];
      }
      
      // For BULK search, optionally enrich top results with details
      if (searchType === 'BULK' && results.length > 0 && results.length <= 5) {
        // For small result sets, try to get details for each
        if (onProgress) onProgress(70, 'جاري استخراج تفاصيل إضافية...');
        
        const enrichedResults = [];
        for (let i = 0; i < Math.min(results.length, 3); i++) {
          const result = results[i];
          if (result.sourceUrl && result.sourceUrl.includes('/maps/place/')) {
            try {
              await chrome.tabs.update(tab.id, { url: result.sourceUrl });
              await waitForTabLoad(tab.id, 10000);
              await delay(TIMING.DETAILS_WAIT);
              
              const details = await extractPlaceDetails(tab.id);
              enrichedResults.push({
                ...result,
                phone: details.phone || result.phone,
                website: details.website || result.website,
                email: details.email || null,
                address: details.address || result.address,
                hours: details.hours,
                detailsExtracted: true,
              });
            } catch (e) {
              enrichedResults.push(result);
            }
          } else {
            enrichedResults.push(result);
          }
        }
        
        // Add remaining results without enrichment
        for (let i = 3; i < results.length; i++) {
          enrichedResults.push(results[i]);
        }
        
        return enrichedResults;
      }
      
      return results;
      
    } catch (error) {
      console.error('[Leedz] ========== SEARCH ERROR ==========');
      console.error('[Leedz] Error:', error.message);
      throw error;
    } finally {
      // Always close tab after search
      if (tab) {
        await closeExecutionTab(tab.id);
        console.log('[Leedz] Tab closed');
        tab = null;
      }
    }
  }, {
    maxAttempts: 2, // Only retry once for the full search
    baseDelay: 3000,
    onRetry: (attempt, error) => {
      if (onProgress) onProgress(10, `فشلت المحاولة ${attempt}، جاري إعادة المحاولة...`);
    },
  });
}

// ==================== Google Search (Layer 2) ====================

/**
 * Search Google and extract additional information
 * Used to find official website and social media links
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.query - Company name
 * @param {string} params.city - City name
 * @param {number} params.tabId - Tab ID to use
 * @returns {Object} - Extracted information
 */
async function searchGoogle({ query, city, tabId }) {
  console.log('[Leedz Google Search] Starting search for:', query, city);
  
  const searchQuery = city ? `${query} ${city}` : query;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=ar`;
  
  console.log('[Leedz Google Search] URL:', searchUrl);
  
  try {
    // Navigate to search page
    await chrome.tabs.update(tabId, { url: searchUrl });
    await waitForTabLoad(tabId, 15000);
    await delay(2500); // Wait for results to render
    
    // Extract results
    const results = await extractGoogleSearchResults(tabId, query);
    
    console.log('[Leedz Google Search] Results:', results);
    return results;
    
  } catch (error) {
    console.error('[Leedz Google Search] Error:', error);
    return {
      officialWebsite: null,
      socialLinks: {},
      additionalInfo: [],
      error: error.message,
    };
  }
}

/**
 * Extract results from Google Search page
 */
async function extractGoogleSearchResults(tabId, searchQuery) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [searchQuery],
      func: (query) => {
        console.log('[Leedz Google Extract] Starting extraction for:', query);
        
        // URL Blacklist - مواقع يجب تجنبها (سوشيال + أدلة + مواقع عامة)
        const BLACKLIST = [
          // Google & Social
          'google.com', 'google.co', 'goo.gl', 'youtube.com', 'facebook.com',
          'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'tiktok.com',
          'snapchat.com', 'wikipedia.org', 'wikidata.org', 'yelp.com',
          'tripadvisor.com', 'foursquare.com', 'yellowpages', 'whitepages',
          // أدلة الشركات السعودية والعربية - يجب تجنبها للحصول على الموقع الرسمي
          'findsaudi.com', 'daleeli.com', 'daleel.com', 'saudiyellow.com',
          'saudiexports.com', 'saudibusiness.com', 'saudicompanies.com',
          'kompass.com', 'yellowpages.com.sa', 'yellowpages.ae',
          'arabianbusiness.com', 'zawya.com', 'argaam.com', 'mubasher.info',
          'crunchbase.com', 'zoominfo.com', 'dnb.com', 'bloomberg.com',
          // مواقع التوظيف
          'bayt.com', 'naukrigulf.com', 'gulftalent.com', 'indeed.com',
          'glassdoor.com', 'wuzzuf.net', 'tanqeeb.com',
          // مواقع أخرى عامة
          'pinterest.com', 'reddit.com', 'quora.com', 'medium.com',
          'blogspot.com', 'wordpress.com', 'tumblr.com',
        ];
        
        // Social Media Patterns
        const SOCIAL_PATTERNS = {
          instagram: [/instagram\.com\/([^\/\?]+)/i],
          twitter: [/twitter\.com\/([^\/\?]+)/i, /x\.com\/([^\/\?]+)/i],
          facebook: [/facebook\.com\/([^\/\?]+)/i],
          linkedin: [/linkedin\.com\/company\/([^\/\?]+)/i, /linkedin\.com\/in\/([^\/\?]+)/i],
          tiktok: [/tiktok\.com\/@([^\/\?]+)/i],
          youtube: [/youtube\.com\/(@?[^\/\?]+)/i],
          snapchat: [/snapchat\.com\/add\/([^\/\?]+)/i],
        };
        
        const extracted = {
          officialWebsite: null,
          socialLinks: {},
          additionalInfo: [],
        };
        
        // Helper: Check if URL is blacklisted
        function isBlacklisted(url) {
          if (!url) return true;
          return BLACKLIST.some(domain => url.toLowerCase().includes(domain));
        }
        
        // Helper: Get social platform from URL
        function getSocialPlatform(url) {
          if (!url) return null;
          for (const [platform, patterns] of Object.entries(SOCIAL_PATTERNS)) {
            for (const pattern of patterns) {
              if (pattern.test(url)) return platform;
            }
          }
          return null;
        }
        
        // Extract from search results - محاولة عدة selectors
        let searchResults = document.querySelectorAll('#search .g, #rso .g, .g[data-hveid]');
        console.log('[Leedz Google Extract] Strategy 1: Found', searchResults.length, 'results');
        
        // إذا لم نجد نتائج، نحاول selectors أخرى
        if (searchResults.length === 0) {
          searchResults = document.querySelectorAll('[data-sokoban-container] .g, .MjjYud .g, div[data-hveid] .g');
          console.log('[Leedz Google Extract] Strategy 2: Found', searchResults.length, 'results');
        }
        
        // محاولة أخيرة - البحث عن أي روابط في نتائج البحث
        if (searchResults.length === 0) {
          searchResults = document.querySelectorAll('#rso > div, #search > div > div');
          console.log('[Leedz Google Extract] Strategy 3: Found', searchResults.length, 'results');
        }
        
        const candidates = [];
        
        // استخراج جميع الروابط من الصفحة
        const allLinks = document.querySelectorAll('a[href^="http"]');
        console.log('[Leedz Google Extract] Total links on page:', allLinks.length);
        
        allLinks.forEach((linkEl, index) => {
          const href = linkEl.href;
          if (!href || href.startsWith('javascript:')) return;
          
          // تخطي روابط Google الداخلية
          if (href.includes('google.com/search') || href.includes('google.com/url')) return;
          
          const title = linkEl.textContent?.trim() || '';
          
          // Check for social media - تجنب السوشيال من مواقع الأدلة
          const socialPlatform = getSocialPlatform(href);
          if (socialPlatform && !extracted.socialLinks[socialPlatform]) {
            // تحقق من أن الرابط ليس من نتيجة بحث لموقع دليل
            // نتحقق من عنوان الرابط - إذا كان يحتوي على اسم موقع دليل نتجاهله
            const linkContext = linkEl.closest('[data-hveid]')?.textContent?.toLowerCase() || '';
            const directoryIndicators = ['findsaudi', 'daleeli', 'yellowpages', 'daleel', 'دليل', 'directory'];
            const isFromDirectory = directoryIndicators.some(d => linkContext.includes(d));
            
            if (!isFromDirectory) {
              extracted.socialLinks[socialPlatform] = href;
              console.log('[Leedz Google Extract] Found social:', socialPlatform, href);
            } else {
              console.log('[Leedz Google Extract] Skipping social from directory:', socialPlatform, href);
            }
          }
          
          // Check for official website candidate
          if (!isBlacklisted(href) && !socialPlatform) {
            let score = 100 - (index * 2); // تقليل العقوبة للموقع
            
            const queryLower = query.toLowerCase();
            const titleLower = title.toLowerCase();
            const hrefLower = href.toLowerCase();
            
            // زيادة النقاط إذا كان العنوان يحتوي على اسم الشركة
            if (titleLower.includes(queryLower)) score += 50;
            
            // زيادة النقاط إذا كان الرابط يحتوي على كلمة من اسم الشركة
            const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
            for (const word of queryWords) {
              if (hrefLower.includes(word)) {
                score += 30;
                break;
              }
            }
            
            // تفضيل الروابط التي تبدو كمواقع رسمية
            if (hrefLower.endsWith('.com') || hrefLower.endsWith('.sa') || hrefLower.endsWith('.net')) {
              score += 10;
            }
            
            candidates.push({ url: href, title, score, position: index });
            console.log('[Leedz Google Extract] Candidate:', href, 'Score:', score);
          }
        });
        
        // Select best website candidate
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.score - a.score);
          extracted.officialWebsite = candidates[0].url;
          console.log('[Leedz Google Extract] Best website:', candidates[0].url);
        }
        
        // Extract from Knowledge Panel
        const knowledgePanel = document.querySelector('#rhs, .kp-wholepage');
        if (knowledgePanel) {
          console.log('[Leedz Google Extract] Found Knowledge Panel');
          
          // Website from KP
          const websiteLink = knowledgePanel.querySelector('[data-attrid*="website"] a, a[href*="://"]');
          if (websiteLink && !isBlacklisted(websiteLink.href)) {
            extracted.officialWebsite = websiteLink.href;
          }
          
          // Social links from KP
          const kpLinks = knowledgePanel.querySelectorAll('a[href]');
          kpLinks.forEach(link => {
            const platform = getSocialPlatform(link.href);
            if (platform && !extracted.socialLinks[platform]) {
              extracted.socialLinks[platform] = link.href;
            }
          });
        }
        
        console.log('[Leedz Google Extract] Final:', extracted);
        return extracted;
      },
    });
    
    return results[0]?.result || {
      officialWebsite: null,
      socialLinks: {},
      additionalInfo: [],
    };
    
  } catch (error) {
    console.error('[Leedz Google Search] Extraction error:', error);
    return {
      officialWebsite: null,
      socialLinks: {},
      additionalInfo: [],
      error: error.message,
    };
  }
}

/**
 * Merge Google Maps result with Google Search result
 */
function mergeSearchResults(mapsData, searchData) {
  const merged = {
    ...mapsData,
    website: mapsData.website || searchData?.officialWebsite || null,
    links: {
      googleMaps: mapsData.sourceUrl || null,
      website: searchData?.officialWebsite || mapsData.website || null,
      ...(searchData?.socialLinks || {}),
    },
    sources: {
      googleMaps: true,
      googleSearch: !!searchData?.officialWebsite || Object.keys(searchData?.socialLinks || {}).length > 0,
    },
  };
  
  // Clean up null links
  if (merged.links) {
    Object.keys(merged.links).forEach(key => {
      if (!merged.links[key]) delete merged.links[key];
    });
  }
  
  return merged;
}

// ==================== Layer 3: Website Deep Scraping ====================

/**
 * استخراج البيانات من الموقع الإلكتروني
 * استراتيجية محسنة: نفتح صفحة اتصل بنا أولاً (الأولوية القصوى للإيميل)
 */
async function scrapeWebsite(websiteUrl, tabId) {
  if (!websiteUrl) return null;
  
  console.log('[Leedz Website] ========== STARTING SMART CRAWL ==========');
  console.log('[Leedz Website] Target:', websiteUrl);
  
  try {
    const baseUrl = new URL(websiteUrl).origin;
    
    const allData = {
      emails: [],
      phones: [],
      socialLinks: {},
      description: null,
      address: null,
      additionalInfo: {},
      scrapedPages: [],
      services: [],
      workingHours: null,
    };
    
    // ==================== الخطوة 1: فتح صفحات الاتصال أولاً (الأولوية القصوى) ====================
    console.log('[Leedz Website] Step 1: PRIORITY - Contact pages first');
    const contactPaths = [
      '/contact-us/',
      '/contact-us',
      '/contact/',
      '/contact',
      '/اتصل-بنا',
      '/تواصل-معنا',
      '/contactus',
    ];
    
    for (const path of contactPaths) {
      const contactUrl = baseUrl + path;
      console.log('[Leedz Website] ========================================');
      console.log('[Leedz Website] Trying contact page:', contactUrl);
      
      try {
        console.log('[Leedz Website] Navigating to:', contactUrl);
        await chrome.tabs.update(tabId, { url: contactUrl });
        
        console.log('[Leedz Website] Waiting for page load...');
        await waitForTabLoad(tabId, 10000);
        
        console.log('[Leedz Website] Page loaded, waiting for content...');
        await delay(3000); // انتظار أطول للتأكد من تحميل الصفحة
        
        // التحقق من URL الحالي
        const currentTab = await chrome.tabs.get(tabId);
        console.log('[Leedz Website] Current URL:', currentTab.url);
        
        // ========== الطريقة 1: استخراج مباشر وبسيط (بدون فحص 404) ==========
        console.log('[Leedz Website] >>> STARTING DIRECT EXTRACTION from:', contactUrl);
        const directEmails = await extractEmailsDirectly(tabId);
        console.log('[Leedz Website] Direct extraction result:', directEmails);
        
        if (directEmails && directEmails.length > 0) {
          console.log('[Leedz Website] ✓✓✓ EMAILS FOUND DIRECTLY:', directEmails);
          directEmails.forEach(e => {
            if (!allData.emails.includes(e)) {
              allData.emails.push(e);
            }
          });
          allData.scrapedPages.push(contactUrl);
          
          // وجدنا إيميل، نتوقف عن البحث في صفحات الاتصال
          console.log('[Leedz Website] ✓ Email found! Stopping contact page search');
          break;
        }
        
        // ========== الطريقة 2: الاستخراج الكامل (إذا لم نجد بالطريقة المباشرة) ==========
        console.log('[Leedz Website] No direct emails, trying full extraction...');
        const contactData = await extractPageData(tabId);
        
        if (contactData) {
          if (contactData.emails?.length > 0) {
            contactData.emails.forEach(e => {
              if (!allData.emails.includes(e)) {
                allData.emails.push(e);
                console.log('[Leedz Website] ✓✓ EMAIL FROM FULL EXTRACTION:', e);
              }
            });
          }
          if (contactData.phones?.length > 0) {
            contactData.phones.forEach(p => {
              if (!allData.phones.includes(p)) allData.phones.push(p);
            });
          }
          if (contactData.socialLinks) {
            Object.assign(allData.socialLinks, contactData.socialLinks);
          }
          if (contactData.address) allData.address = contactData.address;
          if (contactData.workingHours) allData.workingHours = contactData.workingHours;
          
          allData.scrapedPages.push(contactUrl);
        }
        
        // إذا وجدنا إيميل، نتوقف
        if (allData.emails.length > 0) {
          console.log('[Leedz Website] Email found, moving to next step');
          break;
        }
      } catch (e) {
        console.log('[Leedz Website] Contact page error:', path, e.message);
      }
    }
    
    // ==================== الخطوة 2: فحص الصفحة الرئيسية ====================
    console.log('[Leedz Website] Step 2: Scraping homepage');
    await chrome.tabs.update(tabId, { url: websiteUrl });
    await waitForTabLoad(tabId, 15000);
    await delay(2000);
    
    const homeData = await extractPageData(tabId);
    if (homeData) {
      // دمج البيانات (بدون تكرار)
      homeData.emails?.forEach(e => {
        if (!allData.emails.includes(e)) allData.emails.push(e);
      });
      homeData.phones?.forEach(p => {
        if (!allData.phones.includes(p)) allData.phones.push(p);
      });
      if (homeData.socialLinks) {
        Object.assign(allData.socialLinks, homeData.socialLinks);
      }
      if (!allData.description && homeData.description) {
        allData.description = homeData.description;
      }
      if (!allData.address && homeData.address) {
        allData.address = homeData.address;
      }
      allData.scrapedPages.push('home');
    }
    
    // ==================== الخطوة 3: جمع الروابط الداخلية ====================
    console.log('[Leedz Website] Step 3: Collecting internal links');
    const internalLinks = await collectInternalLinks(tabId, baseUrl);
    console.log('[Leedz Website] Found', internalLinks.length, 'internal links');
    
    // ==================== الخطوة 4: تصفح صفحات إضافية (about, services) ====================
    console.log('[Leedz Website] Step 4: Crawling additional pages');
    const crawlData = await crawlImportantPages(tabId, baseUrl, internalLinks, 6);
    
    // دمج بيانات الـ Crawler
    crawlData?.emails?.forEach(e => {
      if (!allData.emails.includes(e)) allData.emails.push(e);
    });
    crawlData?.phones?.forEach(p => {
      if (!allData.phones.includes(p)) allData.phones.push(p);
    });
    if (crawlData?.socialLinks) {
      Object.assign(allData.socialLinks, crawlData.socialLinks);
    }
    if (!allData.description && crawlData?.descriptions?.[0]) {
      allData.description = crawlData.descriptions[0];
    }
    if (!allData.address && crawlData?.addresses?.[0]) {
      allData.address = crawlData.addresses[0];
    }
    if (crawlData?.services?.length > 0) {
      allData.services = crawlData.services;
    }
    allData.scrapedPages.push(...(crawlData?.pagesScraped || []));
    
    console.log('[Leedz Website] ========== CRAWL COMPLETE ==========');
    console.log('[Leedz Website] Pages scraped:', allData.scrapedPages.length);
    console.log('[Leedz Website] Emails found:', allData.emails);
    console.log('[Leedz Website] Phones found:', allData.phones);
    console.log('[Leedz Website] Social links:', Object.keys(allData.socialLinks));
    console.log('[Leedz Website] ====================================');
    
    return allData;
    
  } catch (error) {
    console.error('[Leedz Website] Scrape error:', error);
    return null;
  }
}

/**
 * تصفح الصفحات المهمة من قائمة روابط مُعطاة
 * يستقبل الروابط الداخلية ويرتبها حسب الأولوية ثم يزورها
 */
async function crawlImportantPages(tabId, baseUrl, internalLinks, maxPages = 10) {
  console.log('[Leedz Crawler] Starting crawl with', internalLinks.length, 'links');
  
  const visitedUrls = new Set();
  const allData = {
    emails: [],
    phones: [],
    socialLinks: {},
    descriptions: [],
    services: [],
    addresses: [],
    pagesScraped: [],
  };
  
  // إذا لم توجد روابط، نحاول بناء روابط افتراضية شاملة
  let linksToProcess = [...internalLinks];
  if (linksToProcess.length === 0) {
    console.log('[Leedz Crawler] No links found, trying comprehensive default paths');
    linksToProcess = [
      // صفحات الاتصال - إنجليزي (مع وبدون slash)
      `${baseUrl}/contact`,
      `${baseUrl}/contact/`,
      `${baseUrl}/contact-us`,
      `${baseUrl}/contact-us/`,
      `${baseUrl}/contactus`,
      `${baseUrl}/contactus/`,
      `${baseUrl}/contact.html`,
      `${baseUrl}/get-in-touch`,
      `${baseUrl}/reach-us`,
      // صفحات الاتصال - عربي
      `${baseUrl}/اتصل-بنا`,
      `${baseUrl}/تواصل-معنا`,
      `${baseUrl}/تواصل`,
      // صفحات من نحن
      `${baseUrl}/about`,
      `${baseUrl}/about/`,
      `${baseUrl}/about-us`,
      `${baseUrl}/about-us/`,
      `${baseUrl}/aboutus`,
      `${baseUrl}/about.html`,
      `${baseUrl}/من-نحن`,
      `${baseUrl}/نبذة-عنا`,
      // صفحات الخدمات
      `${baseUrl}/services`,
      `${baseUrl}/services/`,
      `${baseUrl}/our-services`,
      `${baseUrl}/خدماتنا`,
      `${baseUrl}/الخدمات`,
      // صفحات أخرى مهمة
      `${baseUrl}/footer`,
      `${baseUrl}/info`,
      `${baseUrl}/company`,
    ];
  }
  
  // إضافة المسارات الافتراضية للروابط الموجودة أيضاً (دائماً)
  const defaultContactPaths = [
    `${baseUrl}/contact`,
    `${baseUrl}/contact/`,
    `${baseUrl}/contact-us`,
    `${baseUrl}/contact-us/`,
    `${baseUrl}/اتصل-بنا`,
    `${baseUrl}/about`,
    `${baseUrl}/about/`,
    `${baseUrl}/about-us`,
    `${baseUrl}/about-us/`,
  ];
  for (const path of defaultContactPaths) {
    if (!linksToProcess.includes(path)) {
      linksToProcess.push(path);
    }
  }
  
  // الصفحات ذات الأولوية العالية
  const priorityPatterns = [
    { pattern: /contact|اتصل|تواصل|راسلنا/i, priority: 1 },
    { pattern: /about|من.?نحن|نبذة/i, priority: 2 },
    { pattern: /service|خدمات|خدماتنا/i, priority: 3 },
    { pattern: /team|فريق|فريقنا/i, priority: 4 },
    { pattern: /branch|فرع|فروع/i, priority: 5 },
  ];
  
  // ترتيب الروابط حسب الأولوية
  const sortedLinks = linksToProcess.sort((a, b) => {
    let aPriority = 99, bPriority = 99;
    for (const pp of priorityPatterns) {
      if (pp.pattern.test(a)) aPriority = Math.min(aPriority, pp.priority);
      if (pp.pattern.test(b)) bPriority = Math.min(bPriority, pp.priority);
    }
    return aPriority - bPriority;
  });
  
  // زيارة الصفحات (الأولوية أولاً)
  const pagesToVisit = sortedLinks.slice(0, maxPages);
  console.log('[Leedz Crawler] Will visit', pagesToVisit.length, 'pages:');
  pagesToVisit.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
  
  for (const url of pagesToVisit) {
    if (visitedUrls.has(url)) continue;
    visitedUrls.add(url);
    
    try {
      console.log('[Leedz Crawler] >>> Navigating to:', url);
      await chrome.tabs.update(tabId, { url });
      
      // انتظار تحميل الصفحة
      await waitForTabLoad(tabId, 10000);
      console.log('[Leedz Crawler] Page loaded, waiting for content...');
      await delay(1500);
      
      // تحقق من أن الصفحة موجودة - لكن نحاول استخراج البيانات على أي حال
      const pageExists = await checkPageExists(tabId);
      if (!pageExists) {
        console.log('[Leedz Crawler] ⚠ Page might be 404, but trying extraction anyway:', url);
        // لا نتخطى - نحاول استخراج البيانات على أي حال
      }
      
      // استخراج البيانات (دائماً نحاول)
      console.log('[Leedz Crawler] Extracting data from:', url);
      const pageData = await extractPageData(tabId);
      
      if (pageData) {
        console.log('[Leedz Crawler] Page data:', {
          emails: pageData.emails?.length || 0,
          phones: pageData.phones?.length || 0,
        });
        
        // دمج البيانات
        if (pageData.emails?.length > 0) {
          pageData.emails.forEach(e => {
            if (!allData.emails.includes(e)) {
              allData.emails.push(e);
              console.log('[Leedz Crawler] ✓ NEW EMAIL FOUND:', e);
            }
          });
        }
        if (pageData.phones?.length > 0) {
          pageData.phones.forEach(p => {
            if (!allData.phones.includes(p)) allData.phones.push(p);
          });
        }
        if (pageData.socialLinks) {
          Object.assign(allData.socialLinks, pageData.socialLinks);
        }
        if (pageData.description) {
          allData.descriptions.push(pageData.description);
        }
        if (pageData.address) {
          allData.addresses.push(pageData.address);
        }
        
        allData.pagesScraped.push(url);
      }
      
    } catch (e) {
      console.log('[Leedz Crawler] ✗ Error visiting:', url, e.message);
    }
  }
  
  console.log('[Leedz Crawler] ========== CRAWL SUMMARY ==========');
  console.log('[Leedz Crawler] Pages scraped:', allData.pagesScraped.length);
  console.log('[Leedz Crawler] Emails:', allData.emails);
  console.log('[Leedz Crawler] Phones:', allData.phones);
  console.log('[Leedz Crawler] ===================================');
  
  return allData;
}

/**
 * جمع جميع الروابط الداخلية من الصفحة - نسخة محسنة
 */
async function collectInternalLinks(tabId, baseUrl) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (baseUrl) => {
        console.log('[Leedz Links] Collecting internal links from:', baseUrl);
        const links = new Set();
        const base = new URL(baseUrl).origin;
        
        // جمع الروابط من جميع العناصر
        const allLinks = document.querySelectorAll('a[href], [onclick*="location"], button[onclick*="href"]');
        console.log('[Leedz Links] Found', allLinks.length, 'link elements');
        
        allLinks.forEach(el => {
          try {
            let href = el.href || el.getAttribute('href');
            
            // محاولة استخراج الرابط من onclick
            if (!href && el.onclick) {
              const onclickStr = el.onclick.toString();
              const urlMatch = onclickStr.match(/(?:location|href)\s*=\s*['"]([^'"]+)['"]/);
              if (urlMatch) href = urlMatch[1];
            }
            
            if (!href) return;
            
            // تجاهل الروابط غير المفيدة
            if (href.includes('#') && !href.includes('#!') || 
                href.includes('javascript:') || 
                href.includes('mailto:') || 
                href.includes('tel:') ||
                href.includes('whatsapp') ||
                href.match(/\.(pdf|jpg|jpeg|png|gif|svg|doc|docx|xls|xlsx)$/i)) return;
            
            // فقط الروابط الداخلية
            if (href.startsWith(base) || href.startsWith('/') || !href.includes('://')) {
              let fullUrl;
              if (href.startsWith('/')) {
                fullUrl = base + href;
              } else if (!href.includes('://')) {
                fullUrl = base + '/' + href;
              } else {
                fullUrl = href;
              }
              
              // تنظيف الرابط
              fullUrl = fullUrl.split('?')[0].split('#')[0];
              
              // تجاهل الصفحة الرئيسية
              if (fullUrl !== base && fullUrl !== base + '/' && fullUrl.length > base.length + 1) {
                links.add(fullUrl);
                console.log('[Leedz Links] Added:', fullUrl);
              }
            }
          } catch (e) {}
        });
        
        // البحث في النص أيضاً عن روابط مخفية
        const pageText = document.body?.innerHTML || '';
        const hrefMatches = pageText.match(/href=["']([^"']+)["']/gi) || [];
        hrefMatches.forEach(match => {
          const urlMatch = match.match(/href=["']([^"']+)["']/i);
          if (urlMatch && urlMatch[1]) {
            const href = urlMatch[1];
            if ((href.startsWith('/') || href.startsWith(base)) && 
                !href.includes('mailto:') && !href.includes('tel:') && !href.includes('#')) {
              const fullUrl = href.startsWith('/') ? base + href : href;
              if (fullUrl !== base && fullUrl !== base + '/') {
                links.add(fullUrl.split('?')[0].split('#')[0]);
              }
            }
          }
        });
        
        console.log('[Leedz Links] Total unique links:', links.size);
        return Array.from(links);
      },
      args: [baseUrl],
    });
    
    const foundLinks = results[0]?.result || [];
    console.log('[Leedz] Collected', foundLinks.length, 'internal links');
    return foundLinks;
  } catch (e) {
    console.error('[Leedz] Error collecting links:', e.message);
    return [];
  }
}

/**
 * البحث عن روابط صفحات الاتصال في الصفحة الحالية
 */
async function findContactPageLinks(tabId, baseUrl) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (baseUrl) => {
        const contactKeywords = [
          'contact', 'اتصل', 'تواصل', 'راسلنا', 'اتصال',
          'contact-us', 'contactus', 'get-in-touch', 'reach-us'
        ];
        const links = [];
        
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.href?.toLowerCase() || '';
          const text = a.innerText?.toLowerCase() || '';
          
          for (const keyword of contactKeywords) {
            if (href.includes(keyword) || text.includes(keyword)) {
              if (href.startsWith(baseUrl) || href.startsWith('/')) {
                const fullUrl = href.startsWith('/') ? baseUrl + href : href;
                if (!links.includes(fullUrl)) {
                  links.push(fullUrl);
                }
              }
              break;
            }
          }
        });
        
        return links.slice(0, 3); // أول 3 روابط فقط
      },
      args: [baseUrl],
    });
    
    return results[0]?.result || [];
  } catch (e) {
    return [];
  }
}

/**
 * التحقق من أن الصفحة موجودة (ليست 404)
 * نسخة محسنة - أكثر تساهلاً لتجنب رفض صفحات صالحة
 */
async function checkPageExists(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const title = document.title?.toLowerCase() || '';
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        const bodyLength = bodyText.length;
        
        // إذا كانت الصفحة فارغة تماماً
        if (bodyLength < 100) {
          console.log('[Leedz Check] Page too short:', bodyLength);
          return false;
        }
        
        // علامات صفحة 404 - فقط في العنوان أو بداية الصفحة
        const notFoundIndicators = [
          'page not found', 'الصفحة غير موجودة',
          'لم يتم العثور على الصفحة', 'this page doesn\'t exist'
        ];
        
        // التحقق من العنوان فقط (أكثر دقة)
        if (title.includes('404') || title.includes('not found') || title.includes('غير موجودة')) {
          console.log('[Leedz Check] 404 in title:', title);
          return false;
        }
        
        // التحقق من أول 200 حرف فقط
        const firstPart = bodyText.substring(0, 200);
        for (const indicator of notFoundIndicators) {
          if (firstPart.includes(indicator)) {
            console.log('[Leedz Check] 404 indicator found:', indicator);
            return false;
          }
        }
        
        console.log('[Leedz Check] Page exists, length:', bodyLength);
        return true;
      },
    });
    
    return results[0]?.result !== false;
  } catch (e) {
    console.log('[Leedz Check] Error checking page:', e.message);
    // في حالة الخطأ، نفترض أن الصفحة موجودة ونحاول استخراج البيانات
    return true;
  }
}

/**
 * استخراج الإيميل مباشرة من الصفحة - طريقة بسيطة ومباشرة
 * هذه الدالة تستخرج الإيميل بدون أي فحوصات معقدة
 * نسخة محسنة مع scroll وانتظار
 */
async function extractEmailsDirectly(tabId) {
  try {
    console.log('[Leedz Direct] ========== STARTING DIRECT EMAIL EXTRACTION ==========');
    console.log('[Leedz Direct] Tab ID:', tabId);
    
    // أولاً: scroll للصفحة لتحميل المحتوى المخفي
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // scroll للأسفل ثم للأعلى
          window.scrollTo(0, document.body.scrollHeight);
          setTimeout(() => window.scrollTo(0, 0), 500);
        },
      });
      await delay(1000); // انتظار تحميل المحتوى
    } catch (scrollErr) {
      console.log('[Leedz Direct] Scroll failed (continuing):', scrollErr.message);
    }
    
    // ثانياً: استخراج الإيميل
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        console.log('[Leedz Direct] ========== EXECUTING IN PAGE CONTEXT ==========');
        console.log('[Leedz Direct] URL:', window.location.href);
        
        const emails = [];
        const phones = [];
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
        
        // القائمة السوداء للإيميلات الوهمية - شاملة جداً
        const blacklist = [
          // إيميلات وهمية عامة
          'example', 'test@', 'email@', 'your@', 'sample', 'demo@', 
          'noreply', 'no-reply', 'placeholder', 'domain.com', 'dummy',
          // ملفات وامتدادات
          '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
          '.css', '.js', '.min.js', '.min.css', '.json', '.xml', '.html',
          // أسماء ملفات شائعة
          'jquery', 'bootstrap', 'animate', 'animation', 'template', 'migrate',
          'pagination', 'datepicker', 'validate', 'translation', 'locale',
          'whatsapp', 'widget', 'plugin', 'theme', 'style', 'script',
          // خدمات تقنية
          'wixpress', 'sentry', 'cloudflare', 'wordpress', 'elementor',
          'woocommerce', 'google', 'facebook', 'twitter', 'instagram',
          // أنماط غير صالحة
          '%40', '%3a', '%2f', 'http', 'https', 'www.',
          // كلمات تقنية
          'layer', 'push', 'block', 'post', 'term', 'cart', 'collateral',
          'related', 'products', 'cross', 'math', 'max', 'min', 'reload',
          'location', 'messages', 'data', 'acf', 'ui', 'wpcf',
        ];
        
        // امتدادات الدومين الصالحة
        const validTLDs = ['com', 'net', 'org', 'sa', 'ae', 'eg', 'jo', 'kw', 'qa', 'bh', 'om', 'ye', 'lb', 'sy', 'iq', 'ps', 'ma', 'dz', 'tn', 'ly', 'sd', 'so', 'mr', 'dj', 'km', 'io', 'co', 'me', 'info', 'biz', 'edu', 'gov'];
        
        const isValidEmail = (email) => {
          if (!email || email.length < 5 || email.length > 100) return false;
          const lower = email.toLowerCase();
          
          // فحص القائمة السوداء
          for (const b of blacklist) {
            if (lower.includes(b)) return false;
          }
          
          // فحص الدومين
          const parts = lower.split('@');
          if (parts.length !== 2) return false;
          
          const localPart = parts[0];
          const domain = parts[1];
          
          // الجزء المحلي يجب أن يكون منطقياً
          if (localPart.length < 2 || localPart.length > 64) return false;
          if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
          if (localPart.includes('..')) return false;
          
          // الدومين يجب أن يكون صالحاً
          if (!domain || domain.length < 4) return false;
          if (!domain.includes('.')) return false;
          
          // فحص TLD
          const tld = domain.split('.').pop();
          if (!tld || tld.length < 2 || tld.length > 6) return false;
          
          // تجاهل الدومينات الوهمية
          if (domain === 'example.com' || domain === 'domain.com') return false;
          if (domain.endsWith('.css') || domain.endsWith('.js')) return false;
          if (domain.endsWith('.min') || domain.endsWith('.max')) return false;
          
          // يجب أن يحتوي على حروف فقط (لا أرقام فقط)
          if (/^\d+$/.test(localPart)) return false;
          
          return true;
        };
        
        // ========== 1. من روابط mailto (الأكثر موثوقية) ==========
        console.log('[Leedz Direct] Method 1: mailto links');
        document.querySelectorAll('a[href^="mailto:"], a[href*="mailto:"]').forEach(link => {
          try {
            const href = link.href || link.getAttribute('href') || '';
            const email = href.replace('mailto:', '').split('?')[0].split('#')[0].trim().toLowerCase();
            if (isValidEmail(email) && !emails.includes(email)) {
              emails.push(email);
              console.log('[Leedz Direct] ✓✓ MAILTO EMAIL:', email);
            }
          } catch (e) {}
        });
        
        // ========== 2. من النص المرئي للصفحة ==========
        console.log('[Leedz Direct] Method 2: visible text');
        const bodyText = document.body?.innerText || '';
        console.log('[Leedz Direct] Body text length:', bodyText.length);
        console.log('[Leedz Direct] Body text sample:', bodyText.substring(0, 500));
        
        const textMatches = bodyText.match(emailRegex) || [];
        console.log('[Leedz Direct] Found in text:', textMatches.length, 'potential emails:', textMatches);
        
        textMatches.forEach(e => {
          const clean = e.toLowerCase();
          if (isValidEmail(clean) && !emails.includes(clean)) {
            emails.push(clean);
            console.log('[Leedz Direct] ✓ Valid email from text:', clean);
          }
        });
        
        // ========== 3. من HTML الكامل ==========
        console.log('[Leedz Direct] Method 3: full HTML');
        const htmlContent = document.documentElement?.innerHTML || '';
        const htmlMatches = htmlContent.match(emailRegex) || [];
        console.log('[Leedz Direct] Found in HTML:', htmlMatches.length, 'potential emails');
        
        htmlMatches.forEach(e => {
          const clean = e.toLowerCase();
          if (isValidEmail(clean) && !emails.includes(clean)) {
            emails.push(clean);
            console.log('[Leedz Direct] ✓ Valid email from HTML:', clean);
          }
        });
        
        // ========== 4. من عناصر محددة (contact sections) ==========
        console.log('[Leedz Direct] Method 4: contact sections');
        const contactSelectors = [
          '.contact', '#contact', '[class*="contact"]', '[id*="contact"]',
          '.footer', '#footer', 'footer',
          '.info', '#info', '[class*="info"]',
          'address', '.address', '#address',
        ];
        
        contactSelectors.forEach(selector => {
          try {
            document.querySelectorAll(selector).forEach(el => {
              const text = el.innerText || el.textContent || '';
              const matches = text.match(emailRegex) || [];
              matches.forEach(e => {
                const clean = e.toLowerCase();
                if (isValidEmail(clean) && !emails.includes(clean)) {
                  emails.push(clean);
                  console.log('[Leedz Direct] ✓ Valid email from section:', clean);
                }
              });
            });
          } catch (e) {}
        });
        
        // ========== 5. استخراج الهاتف أيضاً ==========
        const phonePatterns = [
          /(?:\+?966|0)[\s-]?5[\d\s-]{8,}/g,
          /(?:\+?971|0)[\s-]?5[\d\s-]{8,}/g,
          /(?:\+?20|0)[\s-]?1[\d\s-]{9,}/g,
          /\d{3}[\s-]?\d{3}[\s-]?\d{4}/g,
        ];
        
        phonePatterns.forEach(pattern => {
          const matches = bodyText.match(pattern) || [];
          matches.forEach(p => {
            const clean = p.replace(/[\s-]/g, '');
            if (clean.length >= 9 && !phones.includes(clean)) {
              phones.push(clean);
            }
          });
        });
        
        console.log('[Leedz Direct] ========== EXTRACTION COMPLETE ==========');
        console.log('[Leedz Direct] Final emails:', emails);
        console.log('[Leedz Direct] Final phones:', phones);
        
        return { emails, phones };
      },
    });
    
    const result = results[0]?.result || { emails: [], phones: [] };
    console.log('[Leedz Direct] Extraction complete:', result);
    
    // إرجاع الإيميلات فقط للتوافق مع الكود الحالي
    return result.emails || [];
    
  } catch (e) {
    console.error('[Leedz Direct] ========== ERROR ==========');
    console.error('[Leedz Direct] Error:', e.message);
    console.error('[Leedz Direct] Stack:', e.stack);
    return [];
  }
}

/**
 * دمج بيانات صفحة مع البيانات المجمعة
 */
function mergePageData(allData, pageData, pageName) {
  if (!pageData) return;
  
  // دمج البريد
  if (pageData.emails?.length > 0) {
    pageData.emails.forEach(email => {
      if (!allData.emails.includes(email)) {
        allData.emails.push(email);
      }
    });
  }
  
  // دمج الهاتف
  if (pageData.phones?.length > 0) {
    pageData.phones.forEach(phone => {
      if (!allData.phones.includes(phone)) {
        allData.phones.push(phone);
      }
    });
  }
  
  // دمج السوشيال
  if (pageData.socialLinks) {
    Object.assign(allData.socialLinks, pageData.socialLinks);
  }
  
  // الوصف (الأول يفوز)
  if (!allData.description && pageData.description) {
    allData.description = pageData.description;
  }
  
  // العنوان (الأول يفوز)
  if (!allData.address && pageData.address) {
    allData.address = pageData.address;
  }
  
  // معلومات إضافية
  if (pageData.additionalInfo) {
    allData.additionalInfo[pageName] = pageData.additionalInfo;
  }
}

/**
 * عمل scroll للصفحة لتحميل المحتوى المخفي (lazy loading)
 * نستخدم طريقة متعددة الخطوات لضمان عمل الـ scroll
 */
async function scrollPage(tabId) {
  console.log('[Leedz Scroll] Starting scroll for tab:', tabId);
  
  try {
    // الخطوة 1: Scroll للأسفل بشكل تدريجي
    for (let step = 0; step < 8; step++) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (stepNum) => {
          const scrollAmount = 500;
          window.scrollBy(0, scrollAmount);
          console.log('[Leedz Scroll] Step', stepNum + 1, '- scrolled to:', window.scrollY);
          return window.scrollY;
        },
        args: [step],
      });
      
      // انتظار بين كل scroll
      await delay(200);
    }
    
    // الخطوة 2: انتظار تحميل المحتوى
    await delay(500);
    
    // الخطوة 3: Scroll للأعلى
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.scrollTo(0, 0);
        console.log('[Leedz Scroll] Scrolled back to top');
      },
    });
    
    await delay(300);
    console.log('[Leedz Scroll] ✓ Scroll complete for tab:', tabId);
    
  } catch (e) {
    console.error('[Leedz Scroll] Error:', e.message);
  }
}

/**
 * استخراج البيانات من الصفحة الحالية - نسخة شاملة ومحسنة
 * تستخدم 8 طرق مختلفة لاستخراج البريد الإلكتروني
 */
async function extractPageData(tabId) {
  try {
    // أولاً: عمل scroll للصفحة لتحميل المحتوى المخفي (lazy loading)
    console.log('[Leedz Extract] Step 0: Scrolling page to load lazy content...');
    await scrollPage(tabId);
    await delay(500);
    
    console.log('[Leedz Extract] Step 1: Extracting data from page...');
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        console.log('[Leedz Extract] Starting COMPREHENSIVE extraction...');
        
        const extracted = {
          emails: [],
          phones: [],
          socialLinks: {},
          description: null,
          address: null,
          services: [],
          workingHours: null,
          additionalInfo: {},
        };
        
        // دالة مساعدة للتحقق من صحة البريد - نسخة محسنة
        const isValidEmail = (email) => {
          if (!email || email.length < 5 || email.length > 100) return false;
          const lower = email.toLowerCase();
          
          // القائمة السوداء الشاملة
          const blacklist = [
            'example', 'test@', 'email@', 'your@', 'sample', 'demo@', 
            'noreply', 'no-reply', 'placeholder', 'domain.com', 'dummy',
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
            '.css', '.js', '.min.js', '.min.css', '.json', '.xml', '.html',
            'jquery', 'bootstrap', 'animate', 'animation', 'template', 'migrate',
            'pagination', 'datepicker', 'validate', 'translation', 'locale',
            'whatsapp-image', 'widget', 'plugin', 'theme', 'style', 'script',
            'wixpress', 'sentry', 'cloudflare', 'wordpress', 'elementor',
            '%40', '%3a', '%2f', 'http', 'https', 'www.',
            'layer', 'push', 'block', 'post-templ', 'term-templ', 'cart', 'collateral',
            'related', 'products', 'cross', 'math', 'reload', 'location', 
            'messages', 'acf', 'wpcf', 'njt-', 'e-anim',
            // إيميلات scripts و tracking و APIs
            'sharethis.com', 'googlesyndic', 'googleads', 'doubleclick',
            'analytics', 'tracking', 'pixel', 'beacon', 'form-api', 'form-cdn',
            'api.', 'static.', 'assets.', 'images.', 'img.', 'media.', 'cdn.',
            'amazonaws', 'azure', 'firebase', 'mailchimp', 'sendgrid',
            '@ion.com', 'uredcompany', 'addfe@', // إيميلات مقطوعة/خاطئة
            'findsaudi', 'daleeli', 'yellowpages', // إيميلات مواقع الأدلة
          ];
          
          for (const b of blacklist) { if (lower.includes(b)) return false; }
          
          const parts = lower.split('@');
          if (parts.length !== 2) return false;
          
          const localPart = parts[0];
          const domain = parts[1];
          
          if (localPart.length < 2 || localPart.length > 64) return false;
          if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
          if (!domain || domain.length < 4 || !domain.includes('.')) return false;
          if (domain.endsWith('.css') || domain.endsWith('.js')) return false;
          if (/^\d+$/.test(localPart)) return false;
          
          return true;
        };
        
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
        const bodyText = document.body?.innerText || '';
        const htmlContent = document.documentElement.innerHTML;
        
        // ==================== استخراج البريد الإلكتروني - 8 طرق ====================
        console.log('[Leedz Extract] Method 1: mailto links');
        document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
          const email = link.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
          if (isValidEmail(email) && !extracted.emails.includes(email)) {
            extracted.emails.push(email);
            console.log('[Leedz] Found mailto:', email);
          }
        });
        
        console.log('[Leedz Extract] Method 2: visible text');
        (bodyText.match(emailRegex) || []).forEach(email => {
          const clean = email.toLowerCase();
          if (isValidEmail(clean) && !extracted.emails.includes(clean)) {
            extracted.emails.push(clean);
            console.log('[Leedz] Found in text:', clean);
          }
        });
        
        console.log('[Leedz Extract] Method 3: full HTML');
        (htmlContent.match(emailRegex) || []).forEach(email => {
          const clean = email.toLowerCase();
          if (isValidEmail(clean) && !extracted.emails.includes(clean)) {
            extracted.emails.push(clean);
            console.log('[Leedz] Found in HTML:', clean);
          }
        });
        
        console.log('[Leedz Extract] Method 4: data attributes');
        document.querySelectorAll('[data-email], [data-mail], [data-contact], [data-e]').forEach(el => {
          const email = el.dataset.email || el.dataset.mail || el.dataset.contact || el.dataset.e;
          if (email && isValidEmail(email.toLowerCase()) && !extracted.emails.includes(email.toLowerCase())) {
            extracted.emails.push(email.toLowerCase());
            console.log('[Leedz] Found in data-attr:', email);
          }
        });
        
        console.log('[Leedz Extract] Method 5: encoded hrefs');
        document.querySelectorAll('a[href*="@"], a[href*="%40"]').forEach(link => {
          try {
            let href = decodeURIComponent(link.href);
            const match = href.match(emailRegex);
            if (match) {
              match.forEach(email => {
                const clean = email.toLowerCase();
                if (isValidEmail(clean) && !extracted.emails.includes(clean)) {
                  extracted.emails.push(clean);
                  console.log('[Leedz] Found in href:', clean);
                }
              });
            }
          } catch (e) {}
        });
        
        console.log('[Leedz Extract] Method 6: obfuscated text');
        const obfuscatedPatterns = [
          /([a-zA-Z0-9._%+-]+)\s*[\[\(]?\s*(?:at|AT|@|ات)\s*[\]\)]?\s*([a-zA-Z0-9.-]+)\s*[\[\(]?\s*(?:dot|DOT|\.|دوت)\s*[\]\)]?\s*([a-zA-Z]{2,})/gi,
        ];
        obfuscatedPatterns.forEach(pattern => {
          let match;
          const textToSearch = bodyText + ' ' + htmlContent;
          while ((match = pattern.exec(textToSearch)) !== null) {
            const email = `${match[1]}@${match[2]}.${match[3]}`.toLowerCase().replace(/\s/g, '');
            if (isValidEmail(email) && !extracted.emails.includes(email)) {
              extracted.emails.push(email);
              console.log('[Leedz] Found obfuscated:', email);
            }
          }
        });
        
        console.log('[Leedz Extract] Method 7: contact sections');
        const contactSelectors = [
          '.contact', '#contact', '[class*="contact"]', '[id*="contact"]',
          '.email', '#email', '[class*="email"]',
          '.footer', '#footer', 'footer',
          '.sidebar', 'aside',
          '[class*="info"]', '[id*="info"]',
          '.widget', '[class*="widget"]'
        ];
        contactSelectors.forEach(selector => {
          try {
            document.querySelectorAll(selector).forEach(el => {
              const text = el.innerText || el.textContent || '';
              const html = el.innerHTML || '';
              [text, html].forEach(content => {
                (content.match(emailRegex) || []).forEach(email => {
                  const clean = email.toLowerCase();
                  if (isValidEmail(clean) && !extracted.emails.includes(clean)) {
                    extracted.emails.push(clean);
                    console.log('[Leedz] Found in section:', clean);
                  }
                });
              });
            });
          } catch (e) {}
        });
        
        console.log('[Leedz Extract] Method 8: JSON-LD Schema');
        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
          try {
            const json = JSON.parse(script.textContent);
            const findEmails = (obj) => {
              if (!obj) return;
              if (typeof obj === 'string' && obj.includes('@')) {
                (obj.match(emailRegex) || []).forEach(email => {
                  const clean = email.toLowerCase();
                  if (isValidEmail(clean) && !extracted.emails.includes(clean)) {
                    extracted.emails.push(clean);
                    console.log('[Leedz] Found in JSON-LD:', clean);
                  }
                });
              } else if (Array.isArray(obj)) obj.forEach(findEmails);
              else if (typeof obj === 'object') Object.values(obj).forEach(findEmails);
            };
            findEmails(json);
          } catch (e) {}
        });
        
        console.log('[Leedz Extract] Total emails found:', extracted.emails.length, extracted.emails);
        
        // ==================== استخراج أرقام الهاتف - شامل ====================
        // 1. من روابط tel
        document.querySelectorAll('a[href^="tel:"]').forEach(link => {
          const phone = link.href.replace('tel:', '').replace(/[\s\-\(\)]/g, '').trim();
          if (phone && phone.length >= 9 && !extracted.phones.includes(phone)) {
            extracted.phones.push(phone);
          }
        });
        
        // 2. أنماط هواتف عربية ودولية
        const phonePatterns = [
          /(?:\+?966|00966|0)[\s.\-]?5[\s.\-]?\d{1}[\s.\-]?\d{3}[\s.\-]?\d{4}/g,
          /(?:\+?966|00966|0)[\s.\-]?1[\s.\-]?\d{1}[\s.\-]?\d{3}[\s.\-]?\d{4}/g,
          /(?:\+?971|00971|0)[\s.\-]?5[\s.\-]?\d{1}[\s.\-]?\d{3}[\s.\-]?\d{4}/g,
          /(?:\+?20|0020|0)[\s.\-]?1[\s.\-]?\d{1}[\s.\-]?\d{3}[\s.\-]?\d{4}/g,
          /(?:\+?962|00962|0)[\s.\-]?7[\s.\-]?\d{1}[\s.\-]?\d{3}[\s.\-]?\d{4}/g,
          /(?:\+?965|00965)[\s.\-]?\d{4}[\s.\-]?\d{4}/g,
          /(?:\+?974|00974)[\s.\-]?\d{4}[\s.\-]?\d{4}/g,
          /(?:\+?973|00973)[\s.\-]?\d{4}[\s.\-]?\d{4}/g,
          /(?:\+?968|00968)[\s.\-]?\d{4}[\s.\-]?\d{4}/g,
          /\+\d{1,3}[\s.\-]?\d{2,4}[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}/g,
        ];
        [bodyText, htmlContent].forEach(content => {
          phonePatterns.forEach(pattern => {
            (content.match(pattern) || []).forEach(phone => {
              const clean = phone.replace(/[\s.\-\(\)]/g, '');
              if (clean.length >= 9 && !extracted.phones.includes(clean)) {
                extracted.phones.push(clean);
              }
            });
          });
        });
        
        // 3. من WhatsApp links
        document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"], a[href*="api.whatsapp"]').forEach(link => {
          const match = link.href.match(/\d{10,}/);
          if (match && !extracted.phones.includes(match[0])) {
            extracted.phones.push(match[0]);
          }
        });
        
        console.log('[Leedz Extract] Total phones found:', extracted.phones.length);
        
        // ==================== استخراج روابط السوشيال ميديا ====================
        const socialPatterns = {
          instagram: /instagram\.com\/([^\/\?\s"']+)/i,
          twitter: /(?:twitter|x)\.com\/([^\/\?\s"']+)/i,
          facebook: /facebook\.com\/([^\/\?\s"']+)/i,
          linkedin: /linkedin\.com\/(?:company|in)\/([^\/\?\s"']+)/i,
          tiktok: /tiktok\.com\/@([^\/\?\s"']+)/i,
          youtube: /youtube\.com\/(?:@|channel\/|c\/)?([^\/\?\s"']+)/i,
          snapchat: /snapchat\.com\/add\/([^\/\?\s"']+)/i,
          whatsapp: /wa\.me\/([^\/\?\s"']+)/i,
        };
        
        // البحث في جميع الروابط - مع تجنب روابط مواقع الأدلة
        const directoryDomains = ['findsaudi', 'daleeli', 'yellowpages', 'daleel', 'kompass', 'zawya'];
        const currentDomain = window.location.hostname.toLowerCase();
        const isDirectorySite = directoryDomains.some(d => currentDomain.includes(d));
        
        // إذا كنا في موقع دليل، لا نستخرج السوشيال منه
        if (!isDirectorySite) {
          const allLinks = document.querySelectorAll('a[href]');
          allLinks.forEach(link => {
            const href = link.href;
            for (const [platform, pattern] of Object.entries(socialPatterns)) {
              if (pattern.test(href) && !extracted.socialLinks[platform]) {
                extracted.socialLinks[platform] = href;
              }
            }
          });
        } else {
          console.log('[Leedz Extract] Skipping social extraction from directory site:', currentDomain);
        }
        
        // البحث في HTML كامل (للروابط المخفية) - فقط إذا لم نكن في موقع دليل
        if (!isDirectorySite) {
          for (const [platform, pattern] of Object.entries(socialPatterns)) {
            if (!extracted.socialLinks[platform]) {
              const match = htmlContent.match(new RegExp(`https?://(?:www\\.)?${pattern.source}`, 'i'));
              if (match) {
                extracted.socialLinks[platform] = match[0];
              }
            }
          }
        }
        
        // ==================== استخراج الوصف ====================
        // من meta tags
        const metaDesc = document.querySelector('meta[name="description"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        extracted.description = metaDesc?.content || ogDesc?.content || null;
        
        // ==================== استخراج العنوان ====================
        // البحث عن عناصر تحتوي على كلمات العنوان
        const addressKeywords = ['العنوان', 'الموقع', 'address', 'location'];
        const allElements = document.querySelectorAll('p, span, div, address');
        for (const el of allElements) {
          const text = el.innerText?.trim() || '';
          if (text.length > 10 && text.length < 200) {
            for (const keyword of addressKeywords) {
              if (text.toLowerCase().includes(keyword)) {
                extracted.address = text;
                break;
              }
            }
          }
          if (extracted.address) break;
        }
        
        // ==================== معلومات إضافية ====================
        // عنوان الصفحة
        extracted.additionalInfo.pageTitle = document.title;
        
        // الكلمات المفتاحية
        const keywords = document.querySelector('meta[name="keywords"]');
        if (keywords?.content) {
          extracted.additionalInfo.keywords = keywords.content;
        }
        
        console.log('[Leedz Website Extract] Extracted:', extracted);
        return extracted;
      },
    });
    
    const data = results[0]?.result;
    if (data) {
      console.log('[Leedz Website] Extraction complete:', {
        emails: data.emails?.length || 0,
        phones: data.phones?.length || 0,
        socialLinks: Object.keys(data.socialLinks || {}).length,
      });
    }
    
    return data;
    
  } catch (error) {
    console.error('[Leedz Website] Scrape error:', error);
    return null;
  }
}

// ==================== Layer 5: Data Validation & Merge ====================

/**
 * دمج والتحقق من جميع البيانات المُجمعة
 * يجمع البيانات من جميع المصادر ويزيل التكرارات والتناقضات
 * نسخة محسنة - تسكين شامل لجميع البيانات
 */
function validateAndMergeAllData(result, websiteData, socialProfiles) {
  console.log('[Leedz Merge] ========== STARTING COMPREHENSIVE DATA MERGE ==========');
  console.log('[Leedz Merge] Input result:', result?.name);
  console.log('[Leedz Merge] Input websiteData emails:', websiteData?.emails);
  console.log('[Leedz Merge] Input websiteData phones:', websiteData?.phones);
  console.log('[Leedz Merge] Input socialProfiles:', Object.keys(socialProfiles || {}));
  
  const merged = { ...result };
  
  // ==================== 1. دمج البريد الإلكتروني ====================
  const allEmails = [];
  
  // من النتيجة الأصلية
  if (merged.email) allEmails.push(merged.email);
  
  // من الموقع (الأولوية القصوى)
  if (websiteData?.emails?.length > 0) {
    console.log('[Leedz Merge] ✓ Found emails from website:', websiteData.emails);
    allEmails.push(...websiteData.emails);
  }
  
  // من السوشيال (bio)
  if (socialProfiles) {
    for (const [platform, profile] of Object.entries(socialProfiles)) {
      if (profile.email) {
        console.log(`[Leedz Merge] ✓ Found email from ${platform}:`, profile.email);
        allEmails.push(profile.email);
      }
    }
  }
  
  // اختيار أفضل بريد (الرسمي أولاً)
  if (allEmails.length > 0) {
    const uniqueEmails = [...new Set(allEmails.map(e => e.toLowerCase()))];
    // ترتيب: info@ أو contact@ أو sales@ أولاً
    const priorityPrefixes = ['info', 'contact', 'sales', 'support', 'admin', 'hello'];
    uniqueEmails.sort((a, b) => {
      const aPrefix = a.split('@')[0].toLowerCase();
      const bPrefix = b.split('@')[0].toLowerCase();
      const aIndex = priorityPrefixes.findIndex(p => aPrefix.includes(p));
      const bIndex = priorityPrefixes.findIndex(p => bPrefix.includes(p));
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    merged.email = uniqueEmails[0];
    merged.allEmails = uniqueEmails;
    console.log('[Leedz Merge] ✓✓ PRIMARY EMAIL SET:', merged.email);
  }
  
  // ==================== 2. دمج أرقام الهاتف ====================
  const allPhones = [];
  
  if (merged.phone) allPhones.push(merged.phone);
  if (websiteData?.phones?.length > 0) {
    console.log('[Leedz Merge] ✓ Found phones from website:', websiteData.phones);
    allPhones.push(...websiteData.phones);
  }
  
  // من السوشيال
  if (socialProfiles) {
    for (const [platform, profile] of Object.entries(socialProfiles)) {
      if (profile.phone) {
        console.log(`[Leedz Merge] ✓ Found phone from ${platform}:`, profile.phone);
        allPhones.push(profile.phone);
      }
    }
  }
  
  if (allPhones.length > 0) {
    merged.allPhones = [...new Set(allPhones)];
    if (!merged.phone) merged.phone = allPhones[0];
    console.log('[Leedz Merge] ✓✓ PRIMARY PHONE SET:', merged.phone);
  }
  
  // ==================== 3. دمج روابط السوشيال ====================
  const allSocialLinks = { ...(merged.links || {}) };
  
  // من الموقع
  if (websiteData?.socialLinks) {
    for (const [platform, url] of Object.entries(websiteData.socialLinks)) {
      if (url && !allSocialLinks[platform]) {
        allSocialLinks[platform] = url;
      }
    }
  }
  
  // من Google Search
  if (merged.socialLinks) {
    for (const [platform, url] of Object.entries(merged.socialLinks)) {
      if (url && !allSocialLinks[platform]) {
        allSocialLinks[platform] = url;
      }
    }
  }
  
  merged.links = allSocialLinks;
  merged.socialLinks = allSocialLinks;
  
  // ==================== 4. دمج بيانات السوشيال ميديا ====================
  if (socialProfiles && Object.keys(socialProfiles).length > 0) {
    merged.socialProfiles = socialProfiles;
    
    // حساب إجمالي المتابعين
    let totalFollowers = 0;
    let latestPostDate = null;
    let totalPosts = 0;
    
    for (const [platform, profile] of Object.entries(socialProfiles)) {
      const followers = parseFollowerCount(profile.followers);
      totalFollowers += followers;
      
      // جمع تاريخ آخر نشر
      const postDate = profile.lastPostDate || profile.lastTweetDate || profile.lastVideoDate;
      if (postDate) {
        if (!latestPostDate || new Date(postDate) > new Date(latestPostDate)) {
          latestPostDate = postDate;
        }
      }
      
      // جمع عدد المنشورات
      const posts = parseInt(profile.posts || profile.tweets || profile.videos || profile.recentPostsCount || 0);
      totalPosts += posts;
    }
    
    merged.totalFollowers = totalFollowers;
    merged.latestSocialActivity = latestPostDate;
    merged.totalSocialPosts = totalPosts;
    
    // تحديد أقوى منصة
    let strongestPlatform = null;
    let maxFollowers = 0;
    for (const [platform, profile] of Object.entries(socialProfiles)) {
      const followers = parseFollowerCount(profile.followers);
      if (followers > maxFollowers) {
        maxFollowers = followers;
        strongestPlatform = platform;
      }
    }
    merged.strongestPlatform = strongestPlatform;
    
    console.log('[Leedz Merge] Social stats:', {
      totalFollowers,
      strongestPlatform,
      latestPostDate,
      totalPosts,
    });
  }
  
  // ==================== 5. دمج الوصف والعنوان ====================
  if (websiteData?.description && !merged.description) {
    merged.description = websiteData.description;
  }
  
  if (websiteData?.address && !merged.address) {
    merged.address = websiteData.address;
  }
  
  // ==================== 6. دمج الخدمات وساعات العمل ====================
  if (websiteData?.services?.length > 0) {
    merged.services = websiteData.services;
  }
  
  if (websiteData?.workingHours) {
    merged.workingHours = websiteData.workingHours;
  }
  
  // من السوشيال (Facebook)
  if (socialProfiles?.facebook?.workingHours && !merged.workingHours) {
    merged.workingHours = socialProfiles.facebook.workingHours;
  }
  
  if (socialProfiles?.facebook?.responseTime) {
    merged.responseTime = socialProfiles.facebook.responseTime;
  }
  
  // ==================== 7. دمج الروابط الخارجية ====================
  const externalLinks = [];
  if (socialProfiles) {
    for (const profile of Object.values(socialProfiles)) {
      if (profile.externalUrl) externalLinks.push(profile.externalUrl);
      if (profile.website) externalLinks.push(profile.website);
    }
  }
  if (externalLinks.length > 0) {
    merged.externalLinks = [...new Set(externalLinks)];
  }
  
  // ==================== 8. حساب درجة اكتمال البيانات ====================
  let dataCompleteness = 0;
  if (merged.name) dataCompleteness += 10;
  if (merged.phone) dataCompleteness += 15;
  if (merged.email) dataCompleteness += 15;
  if (merged.website) dataCompleteness += 10;
  if (merged.address) dataCompleteness += 10;
  if (merged.rating) dataCompleteness += 5;
  if (merged.description) dataCompleteness += 5;
  if (Object.keys(merged.socialLinks || {}).length > 0) dataCompleteness += 10;
  if (merged.socialProfiles && Object.keys(merged.socialProfiles).length > 0) dataCompleteness += 10;
  if (merged.totalFollowers > 0) dataCompleteness += 5;
  if (merged.services?.length > 0) dataCompleteness += 5;
  
  merged.dataCompleteness = Math.min(dataCompleteness, 100);
  merged.dataSources = {
    googleMaps: !!merged.sourceUrl,
    googleSearch: !!merged.sources?.googleSearch,
    website: !!websiteData,
    websitePages: websiteData?.scrapedPages?.length || 0,
    socialMedia: !!(socialProfiles && Object.keys(socialProfiles).length > 0),
    socialPlatforms: Object.keys(socialProfiles || {}),
  };
  
  console.log('[Leedz Merge] ========== MERGE COMPLETE ==========');
  console.log('[Leedz Merge] Final data:', {
    email: merged.email,
    allEmails: merged.allEmails?.length || 0,
    phone: merged.phone,
    allPhones: merged.allPhones?.length || 0,
    socialLinks: Object.keys(merged.socialLinks || {}).length,
    socialProfiles: Object.keys(merged.socialProfiles || {}).length,
    totalFollowers: merged.totalFollowers || 0,
    dataCompleteness: merged.dataCompleteness,
  });
  console.log('[Leedz Merge] =====================================');
  
  return merged;
}

/**
 * تحويل عدد المتابعين إلى رقم
 */
function parseFollowerCount(followers) {
  if (!followers) return 0;
  
  const cleaned = String(followers).toLowerCase().replace(/[,\s]/g, '');
  
  if (cleaned.includes('k') || cleaned.includes('ألف')) {
    return parseFloat(cleaned) * 1000;
  }
  if (cleaned.includes('m') || cleaned.includes('مليون')) {
    return parseFloat(cleaned) * 1000000;
  }
  
  return parseInt(cleaned) || 0;
}

// Extract detailed info from a single place page in Google Maps
async function extractPlaceDetails(tabId) {
  console.log('[Leedz] Extracting detailed place info from tab:', tabId);
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        console.log('[Leedz Details] ========== EXTRACTING PLACE DETAILS ==========');
        
        // ==================== Selectors Configuration ====================
        const SELECTORS = {
          name: [
            'h1.DUwDvf',
            'h1.fontHeadlineLarge',
            '[role="main"] h1',
            '.qBF1Pd',
            '.fontHeadlineSmall',
          ],
          phone: [
            'button[data-item-id*="phone"]',
            'a[data-item-id*="phone"]',
            '[aria-label*="Phone"]',
            '[aria-label*="phone"]',
            '[aria-label*="هاتف"]',
            '[aria-label*="رقم الهاتف"]',
            'a[href^="tel:"]',
            'button[data-tooltip*="phone"]',
            '.rogA2c[data-item-id*="phone"]',
          ],
          website: [
            'a[data-item-id*="authority"]',
            'a[data-item-id*="website"]',
            '[aria-label*="Website"]',
            '[aria-label*="website"]',
            '[aria-label*="موقع"]',
            '[aria-label*="الموقع الإلكتروني"]',
            'a.CsEnBe[data-item-id*="authority"]',
          ],
          address: [
            'button[data-item-id*="address"]',
            '[data-item-id*="address"]',
            '[aria-label*="Address"]',
            '[aria-label*="عنوان"]',
            '.rogA2c',
            '.Io6YTe',
            '.LrzXr',
          ],
          rating: [
            'div.F7nice span[aria-hidden="true"]',
            'span.ceNzKf',
            'div.fontDisplayLarge',
            'span.MW4etd',
            '.F7nice span:first-child',
          ],
          reviews: [
            'span[aria-label*="review"]',
            'button[aria-label*="review"]',
            'span[aria-label*="مراجع"]',
            '.F7nice span:last-child',
            'span.UY7F9',
          ],
          category: [
            'button[jsaction*="category"]',
            'span.DkEaL',
            '.fontBodyMedium button',
          ],
          hours: [
            '[aria-label*="hour"]',
            '[aria-label*="Hours"]',
            '[aria-label*="ساعات"]',
            '[data-item-id*="hour"]',
            '.t39EBf',
            '.o0Svhf',
          ],
        };
        
        // ==================== Helper Functions ====================
        function findElement(selectors) {
          for (const selector of selectors) {
            try {
              const el = document.querySelector(selector);
              if (el) return el;
            } catch (e) { /* invalid selector */ }
          }
          return null;
        }
        
        function findAllElements(selectors) {
          const found = new Set();
          const results = [];
          for (const selector of selectors) {
            try {
              document.querySelectorAll(selector).forEach(el => {
                if (!found.has(el)) {
                  found.add(el);
                  results.push(el);
                }
              });
            } catch (e) { /* invalid selector */ }
          }
          return results;
        }
        
        function extractPhoneFromText(text) {
          if (!text) return null;
          // Multiple phone patterns
          const patterns = [
            /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/g,
            /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/,
            /[\d\s\-\+\(\)]{7,20}/,
          ];
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
              const phone = match[0].trim();
              const digitsOnly = phone.replace(/\D/g, '');
              if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
                return phone;
              }
            }
          }
          return null;
        }
        
        function normalizeWebsite(url) {
          if (!url) return null;
          if (url.includes('google.com') || url.includes('goo.gl')) return null;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          return url;
        }
        
        // ==================== Initialize Details Object ====================
        const details = {
          name: null,
          phone: null,
          website: null,
          email: null,
          address: null,
          rating: null,
          reviews: null,
          category: null,
          hours: null,
          priceLevel: null,
          plusCode: null,
          coordinates: null,
        };
        
        // ==================== Extract Name ====================
        const nameEl = findElement(SELECTORS.name);
        details.name = nameEl?.textContent?.trim() || null;
        console.log('[Leedz Details] Name:', details.name);
        
        // ==================== Extract Rating ====================
        const ratingEl = findElement(SELECTORS.rating);
        if (ratingEl) {
          const ratingText = ratingEl.textContent?.trim();
          if (ratingText && /^\d/.test(ratingText)) {
            details.rating = ratingText.replace(',', '.');
          }
        }
        console.log('[Leedz Details] Rating:', details.rating);
        
        // ==================== Extract Reviews ====================
        const reviewsElements = findAllElements(SELECTORS.reviews);
        for (const el of reviewsElements) {
          const text = el.getAttribute('aria-label') || el.textContent || '';
          const patterns = [/\((\d[\d,\.]*)\)/, /(\d[\d,\.]*)\s*reviews?/i, /(\d[\d,\.]*)\s*مراجع/];
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
              details.reviews = match[1].replace(/,/g, '');
              break;
            }
          }
          if (details.reviews) break;
        }
        console.log('[Leedz Details] Reviews:', details.reviews);
        
        // ==================== Extract Category ====================
        const categoryEl = findElement(SELECTORS.category);
        details.category = categoryEl?.textContent?.trim() || null;
        console.log('[Leedz Details] Category:', details.category);
        
        // ==================== Extract Phone (Multi-Strategy) ====================
        // Strategy 1: Direct selectors
        const phoneElements = findAllElements(SELECTORS.phone);
        for (const el of phoneElements) {
          const ariaLabel = el.getAttribute('aria-label') || '';
          const text = el.textContent?.trim() || '';
          const href = el.getAttribute('href') || '';
          
          // Try tel: href first
          if (href.startsWith('tel:')) {
            details.phone = href.replace('tel:', '').trim();
            break;
          }
          
          // Try aria-label
          const phoneFromLabel = extractPhoneFromText(ariaLabel);
          if (phoneFromLabel) {
            details.phone = phoneFromLabel;
            break;
          }
          
          // Try text content
          const phoneFromText = extractPhoneFromText(text);
          if (phoneFromText) {
            details.phone = phoneFromText;
            break;
          }
        }
        
        // Strategy 2: Look for tel: links anywhere
        if (!details.phone) {
          const telLinks = document.querySelectorAll('a[href^="tel:"]');
          for (const link of telLinks) {
            const phone = link.getAttribute('href').replace('tel:', '').trim();
            if (phone && phone.replace(/\D/g, '').length >= 7) {
              details.phone = phone;
              break;
            }
          }
        }
        
        // Strategy 3: Scan all buttons/divs for phone patterns
        if (!details.phone) {
          const allClickables = document.querySelectorAll('button, div[role="button"], [data-item-id]');
          for (const el of allClickables) {
            const text = el.textContent?.trim() || '';
            const ariaLabel = el.getAttribute('aria-label') || '';
            
            // Check if this looks like a phone element
            const combined = ariaLabel + ' ' + text;
            if (combined.toLowerCase().includes('phone') || combined.includes('هاتف') || combined.includes('اتصال')) {
              const phone = extractPhoneFromText(combined);
              if (phone) {
                details.phone = phone;
                break;
              }
            }
            
            // Check for standalone phone number
            if (/^[\d\s\-\+\(\)]{7,20}$/.test(text)) {
              details.phone = text;
              break;
            }
          }
        }
        console.log('[Leedz Details] Phone:', details.phone);
        
        // ==================== Extract Website (Multi-Strategy) ====================
        // Strategy 1: Direct selectors
        const websiteElements = findAllElements(SELECTORS.website);
        for (const el of websiteElements) {
          const href = el.getAttribute('href') || el.querySelector('a')?.href;
          const normalized = normalizeWebsite(href);
          if (normalized) {
            details.website = normalized;
            break;
          }
          
          // Try text content for URL
          const text = el.textContent?.trim() || '';
          if (text.match(/^(www\.|http|[a-z0-9][-a-z0-9]*\.[a-z]{2,})/i)) {
            const normalizedText = normalizeWebsite(text);
            if (normalizedText) {
              details.website = normalizedText;
              break;
            }
          }
        }
        
        // Strategy 2: Look for external links
        if (!details.website) {
          const allLinks = document.querySelectorAll('a[href]');
          for (const link of allLinks) {
            const href = link.getAttribute('href');
            if (href && !href.includes('google.com') && !href.includes('goo.gl') && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
              const ariaLabel = link.getAttribute('aria-label') || '';
              if (ariaLabel.toLowerCase().includes('website') || ariaLabel.includes('موقع')) {
                details.website = normalizeWebsite(href);
                break;
              }
            }
          }
        }
        
        // Strategy 3: Scan for URL patterns in text
        if (!details.website) {
          const allElements = document.querySelectorAll('button, div[role="button"], span, div');
          for (const el of allElements) {
            const text = el.textContent?.trim() || '';
            if (text.length < 100 && text.match(/^(www\.|http|[a-z0-9][-a-z0-9]*\.[a-z]{2,})/i)) {
              if (!text.includes('google.com')) {
                details.website = normalizeWebsite(text);
                break;
              }
            }
          }
        }
        console.log('[Leedz Details] Website:', details.website);
        
        // ==================== Extract Address (Multi-Strategy) ====================
        // Strategy 1: Direct selectors
        const addressElements = findAllElements(SELECTORS.address);
        for (const el of addressElements) {
          const ariaLabel = el.getAttribute('aria-label') || '';
          const text = el.textContent?.trim() || '';
          
          // Check aria-label for address
          if (ariaLabel.toLowerCase().includes('address') || ariaLabel.includes('عنوان')) {
            const cleanAddress = ariaLabel.replace(/^(Address|عنوان):\s*/i, '').trim();
            if (cleanAddress.length > 5) {
              details.address = cleanAddress;
              break;
            }
          }
          
          // Check text content (should be reasonable length for address)
          if (text.length > 10 && text.length < 200 && !text.match(/^\d[.,]\d/)) {
            if (!details.address || text.length > details.address.length) {
              details.address = text;
            }
          }
        }
        
        // Strategy 2: Look for address in specific containers
        if (!details.address) {
          const addressContainers = document.querySelectorAll('.rogA2c, .Io6YTe, .LrzXr, [data-item-id*="address"]');
          for (const container of addressContainers) {
            const text = container.textContent?.trim();
            if (text && text.length > 10 && text.length < 200) {
              // Avoid phone numbers and ratings
              if (!text.match(/^[\d\s\-\+\(\)]+$/) && !text.match(/^\d[.,]\d/)) {
                details.address = text;
                break;
              }
            }
          }
        }
        console.log('[Leedz Details] Address:', details.address);
        
        // ==================== Extract Hours ====================
        const hoursElements = findAllElements(SELECTORS.hours);
        for (const el of hoursElements) {
          const ariaLabel = el.getAttribute('aria-label') || '';
          if (ariaLabel) {
            details.hours = ariaLabel.replace(/^.*?:\s*/, '').trim();
            break;
          }
          const text = el.textContent?.trim();
          if (text && text.length > 3) {
            details.hours = text;
            break;
          }
        }
        console.log('[Leedz Details] Hours:', details.hours);
        
        // ==================== Extract Email (Bonus) ====================
        const pageText = document.body.innerText || '';
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          details.email = emailMatch[0];
        }
        console.log('[Leedz Details] Email:', details.email);
        
        console.log('[Leedz Details] ========== EXTRACTION COMPLETE ==========');
        console.log('[Leedz Details] Summary:', JSON.stringify(details, null, 2));
        
        return details;
      },
    });
    
    return results[0]?.result || {};
  } catch (error) {
    console.error('[Leedz] Failed to extract place details:', error);
    return {};
  }
}

// Scroll the results panel to load more results
async function scrollForMoreResults(tabId, targetCount) {
  console.log('[Leedz] Scrolling for more results, target:', targetCount);
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [targetCount],
      func: async (target) => {
        const scrollContainer = document.querySelector('div[role="feed"]') || 
                               document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf');
        
        if (!scrollContainer) {
          console.log('[Leedz Scroll] No scroll container found');
          return;
        }
        
        let lastCount = 0;
        let sameCountIterations = 0;
        const maxIterations = 15;
        
        for (let i = 0; i < maxIterations; i++) {
          // Count current results
          const currentResults = document.querySelectorAll('div[role="feed"] > div > div[jsaction], .Nv2PK, [role="article"]');
          const currentCount = currentResults.length;
          
          console.log('[Leedz Scroll] Iteration', i + 1, '- Results:', currentCount);
          
          if (currentCount >= target) {
            console.log('[Leedz Scroll] Reached target count');
            break;
          }
          
          if (currentCount === lastCount) {
            sameCountIterations++;
            if (sameCountIterations >= 3) {
              console.log('[Leedz Scroll] No more results loading');
              break;
            }
          } else {
            sameCountIterations = 0;
          }
          
          lastCount = currentCount;
          
          // Scroll down
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          
          // Wait for new results to load
          await new Promise(r => setTimeout(r, 1500));
        }
      },
    });
  } catch (error) {
    console.error('[Leedz] Scroll error:', error);
  }
}

async function extractGoogleMapsResults(tabId, limit = 30, exactMatch = null) {
  console.log('[Leedz] Extracting results from tab:', tabId, 'limit:', limit);
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [limit, exactMatch],
      func: (maxResults, searchName) => {
        console.log('[Leedz Extract] ========== STARTING EXTRACTION ==========');
        console.log('[Leedz Extract] Max results:', maxResults);
        console.log('[Leedz Extract] Search name:', searchName);
        console.log('[Leedz Extract] Page URL:', window.location.href);
        
        // ==================== Selectors Configuration ====================
        const SELECTORS = {
          placeLinks: [
            'a[href*="/maps/place/"]',
            '.hfpxzc',
            '[role="article"] a[href*="/maps/place/"]',
          ],
          feedContainer: [
            'div[role="feed"]',
            '.m6QErb.DxyBCb.kA9KIf.dS8AEf',
            '.m6QErb[aria-label]',
          ],
          resultItems: [
            'div[role="feed"] > div > div[jsaction]',
            '.Nv2PK',
            '[role="article"]',
          ],
          name: [
            '.fontHeadlineSmall',
            '.qBF1Pd',
            '[class*="fontHeadline"]',
            '.NrDZNb',
            '.dbg0pd',
          ],
          rating: [
            'span.MW4etd',
            '.F7nice span[aria-hidden="true"]',
            'span.ceNzKf',
          ],
          reviews: [
            'span.UY7F9',
            '.F7nice span:last-child',
          ],
          category: [
            '.W4Efsd:first-child span',
            '.W4Efsd span.W4Efsd',
          ],
          address: [
            '.W4Efsd:last-child',
            '.W4Efsd span:not(.MW4etd)',
          ],
          singlePlace: [
            'h1.DUwDvf',
            'h1.fontHeadlineLarge',
            '[role="main"] h1',
          ],
        };
        
        // ==================== Helper Functions ====================
        function findElement(container, selectors) {
          for (const selector of selectors) {
            try {
              const el = container.querySelector(selector);
              if (el) return el;
            } catch (e) { /* invalid selector */ }
          }
          return null;
        }
        
        function findAllElements(container, selectors) {
          const found = new Set();
          const results = [];
          for (const selector of selectors) {
            try {
              container.querySelectorAll(selector).forEach(el => {
                if (!found.has(el)) {
                  found.add(el);
                  results.push(el);
                }
              });
            } catch (e) { /* invalid selector */ }
          }
          return results;
        }
        
        function extractRating(container) {
          const ratingEl = findElement(container, SELECTORS.rating);
          if (ratingEl) {
            const text = ratingEl.textContent?.trim();
            if (text && /^\d[.,]?\d?$/.test(text)) {
              return text.replace(',', '.');
            }
          }
          // Fallback: search in text
          const containerText = container.textContent || '';
          const match = containerText.match(/(\d[.,]\d)\s*(?:★|\()/);
          return match ? match[1].replace(',', '.') : null;
        }
        
        function extractReviews(container) {
          const reviewsEl = findElement(container, SELECTORS.reviews);
          if (reviewsEl) {
            const text = reviewsEl.textContent?.trim();
            const match = text?.match(/\(?([\d,\.]+)\)?/);
            if (match) return match[1].replace(/,/g, '');
          }
          // Fallback: search in text
          const containerText = container.textContent || '';
          const patterns = [/\((\d[\d,\.]*)\)/, /(\d[\d,\.]*)\s*reviews?/i];
          for (const pattern of patterns) {
            const match = containerText.match(pattern);
            if (match) return match[1].replace(/,/g, '');
          }
          return null;
        }
        
        function extractCategory(container) {
          const categoryEl = findElement(container, SELECTORS.category);
          if (categoryEl) {
            const text = categoryEl.textContent?.trim();
            // Filter out ratings and reviews
            if (text && !text.match(/^\d/) && text.length < 50) {
              return text.split('·')[0].trim();
            }
          }
          return null;
        }
        
        function extractAddress(container) {
          const addressEl = findElement(container, SELECTORS.address);
          if (addressEl) {
            const text = addressEl.textContent?.trim();
            // Filter out short text and ratings
            if (text && text.length > 5 && !text.match(/^\d[.,]\d/)) {
              // Clean up - remove category prefix if present
              const parts = text.split('·');
              return parts.length > 1 ? parts.slice(1).join('·').trim() : text;
            }
          }
          return null;
        }
        
        function calculateMatchScore(name, searchName) {
          if (!searchName) return 100;
          
          const normalizedName = name.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').trim();
          const normalizedSearch = searchName.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').trim();
          
          // Exact match
          if (normalizedName === normalizedSearch) return 100;
          
          // Contains match
          if (normalizedName.includes(normalizedSearch)) return 90;
          if (normalizedSearch.includes(normalizedName)) return 85;
          
          // Word-based matching
          const nameWords = normalizedName.split(/\s+/).filter(w => w.length > 1);
          const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 1);
          
          if (nameWords.length === 0 || searchWords.length === 0) return 30;
          
          let matchingWords = 0;
          let partialMatches = 0;
          
          for (const sw of searchWords) {
            for (const nw of nameWords) {
              if (nw === sw) {
                matchingWords++;
                break;
              } else if (nw.includes(sw) || sw.includes(nw)) {
                partialMatches++;
                break;
              }
            }
          }
          
          const fullMatchScore = (matchingWords / searchWords.length) * 70;
          const partialMatchScore = (partialMatches / searchWords.length) * 20;
          
          return Math.max(30, Math.round(fullMatchScore + partialMatchScore));
        }
        
        // ==================== Main Extraction Logic ====================
        const items = [];
        const seenNames = new Set();
        
        // ==================== Strategy 1: Place Links (Most Reliable) ====================
        console.log('[Leedz Extract] Strategy 1: Looking for place links...');
        const placeLinks = findAllElements(document, SELECTORS.placeLinks);
        console.log('[Leedz Extract] Found', placeLinks.length, 'place links');
        
        for (const link of placeLinks) {
          if (items.length >= maxResults) break;
          
          // Get the parent container
          let container = link.closest('div[jsaction]') || 
                         link.closest('.Nv2PK') || 
                         link.closest('[role="article"]') ||
                         link.parentElement?.parentElement?.parentElement;
          if (!container) container = link;
          
          // Extract name - multiple strategies
          let name = '';
          
          // Try aria-label first (most reliable)
          const ariaLabel = link.getAttribute('aria-label');
          if (ariaLabel) {
            name = ariaLabel.split('·')[0].trim();
          }
          
          // Try name selectors
          if (!name) {
            const nameEl = findElement(container, SELECTORS.name);
            name = nameEl?.textContent?.trim() || '';
          }
          
          // Try link text
          if (!name) {
            name = link.textContent?.trim() || '';
            if (name.includes('·')) name = name.split('·')[0].trim();
          }
          
          // Validate name
          if (!name || name.length < 2 || name.length > 150) continue;
          
          // Skip duplicates
          const nameKey = name.toLowerCase().trim();
          if (seenNames.has(nameKey)) continue;
          seenNames.add(nameKey);
          
          // Extract other data
          const rating = extractRating(container);
          const reviews = extractReviews(container);
          const category = extractCategory(container);
          const address = extractAddress(container);
          const matchScore = calculateMatchScore(name, searchName);
          
          console.log('[Leedz Extract] Found:', name, '| Rating:', rating, '| Score:', matchScore);
          
          items.push({
            name,
            rating,
            reviews,
            type: category,
            address,
            phone: null,
            website: null,
            source: 'google_maps',
            sourceUrl: link.href || window.location.href,
            matchScore,
          });
        }
        
        // ==================== Strategy 2: Feed Items ====================
        if (items.length === 0) {
          console.log('[Leedz Extract] Strategy 2: Looking for feed items...');
          const feedContainer = findElement(document, SELECTORS.feedContainer);
          
          if (feedContainer) {
            const feedItems = feedContainer.querySelectorAll(':scope > div');
            console.log('[Leedz Extract] Found', feedItems.length, 'feed items');
            
            for (const item of feedItems) {
              if (items.length >= maxResults) break;
              
              // Try to find a link inside
              const link = item.querySelector('a[href*="/maps/place/"]');
              const nameEl = findElement(item, SELECTORS.name);
              
              let name = '';
              if (link) {
                name = link.getAttribute('aria-label')?.split('·')[0].trim() || '';
              }
              if (!name && nameEl) {
                name = nameEl.textContent?.trim() || '';
              }
              if (!name) {
                // Last resort: first line of text
                const text = item.textContent?.trim() || '';
                name = text.split('\n')[0]?.trim() || '';
              }
              
              if (!name || name.length < 2 || name.length > 150) continue;
              
              const nameKey = name.toLowerCase().trim();
              if (seenNames.has(nameKey)) continue;
              seenNames.add(nameKey);
              
              const rating = extractRating(item);
              const reviews = extractReviews(item);
              const category = extractCategory(item);
              const address = extractAddress(item);
              const matchScore = calculateMatchScore(name, searchName);
              
              console.log('[Leedz Extract] Found from feed:', name);
              
              items.push({
                name,
                rating,
                reviews,
                type: category,
                address,
                phone: null,
                website: null,
                source: 'google_maps',
                sourceUrl: link?.href || window.location.href,
                matchScore,
              });
            }
          }
        }
        
        // ==================== Strategy 3: Single Place View ====================
        if (items.length === 0) {
          console.log('[Leedz Extract] Strategy 3: Checking for single place view...');
          const placeTitle = findElement(document, SELECTORS.singlePlace);
          
          if (placeTitle) {
            const name = placeTitle.textContent?.trim();
            if (name && name.length > 1) {
              console.log('[Leedz Extract] Found single place:', name);
              
              // Try to extract more details from the page
              const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
              const rating = ratingEl?.textContent?.trim()?.replace(',', '.') || null;
              
              const reviewsEl = document.querySelector('span[aria-label*="review"]');
              const reviewsText = reviewsEl?.getAttribute('aria-label') || '';
              const reviewsMatch = reviewsText.match(/([\d,]+)/);
              const reviews = reviewsMatch ? reviewsMatch[1].replace(/,/g, '') : null;
              
              const categoryEl = document.querySelector('button[jsaction*="category"], span.DkEaL');
              const category = categoryEl?.textContent?.trim() || null;
              
              items.push({
                name,
                rating,
                reviews,
                type: category,
                address: null,
                phone: null,
                website: null,
                source: 'google_maps',
                sourceUrl: window.location.href,
                matchScore: 100,
              });
            }
          }
        }
        
        // ==================== Strategy 4: Article Elements ====================
        if (items.length === 0) {
          console.log('[Leedz Extract] Strategy 4: Looking for article elements...');
          const articles = document.querySelectorAll('[role="article"]');
          console.log('[Leedz Extract] Found', articles.length, 'articles');
          
          for (const article of articles) {
            if (items.length >= maxResults) break;
            
            const nameEl = findElement(article, SELECTORS.name);
            const name = nameEl?.textContent?.trim();
            
            if (!name || name.length < 2) continue;
            
            const nameKey = name.toLowerCase().trim();
            if (seenNames.has(nameKey)) continue;
            seenNames.add(nameKey);
            
            const link = article.querySelector('a[href*="/maps/place/"]');
            const matchScore = calculateMatchScore(name, searchName);
            
            console.log('[Leedz Extract] Found from article:', name);
            
            items.push({
              name,
              rating: extractRating(article),
              reviews: extractReviews(article),
              type: extractCategory(article),
              address: extractAddress(article),
              phone: null,
              website: null,
              source: 'google_maps',
              sourceUrl: link?.href || window.location.href,
              matchScore,
            });
          }
        }
        
        // ==================== Sort Results ====================
        if (searchName) {
          items.sort((a, b) => b.matchScore - a.matchScore);
        }
        
        console.log('[Leedz Extract] ========== EXTRACTION COMPLETE ==========');
        console.log('[Leedz Extract] Total items extracted:', items.length);
        if (items.length > 0) {
          console.log('[Leedz Extract] Sample:', items[0]);
        }
        
        return items;
      },
    });
    
    const extracted = results[0]?.result || [];
    console.log('[Leedz] Extraction returned:', extracted.length, 'items');
    return extracted;
  } catch (error) {
    console.error('[Leedz] Failed to extract Google Maps results:', error);
    return [];
  }
}

async function executeGoogleMapsSearch(jobPlan) {
  const { query, city, country, searchType, maxResults } = jobPlan.context || {};
  const jobId = jobPlan.jobId;
  const startTime = Date.now();
  
  // تعيين معرف الوظيفة الحالية للتحكم في الإيقاف
  currentJobId = jobId;
  currentSearchAborted = false;
  
  console.log('[Leedz] ============================================');
  console.log('[Leedz] EXECUTING GOOGLE MAPS SEARCH JOB');
  console.log('[Leedz] Job ID:', jobId);
  console.log('[Leedz] Query:', query);
  console.log('[Leedz] City:', city);
  console.log('[Leedz] Country:', country);
  console.log('[Leedz] Search Type:', searchType);
  console.log('[Leedz] Max Results:', maxResults);
  console.log('[Leedz] ============================================');
  
  if (!query) {
    console.error('[Leedz] ERROR: No query provided');
    await markJobComplete(jobId, { status: 'FAILED', error: 'Search query is required' });
    throw new Error('Search query is required');
  }
  
  // التحقق من جودة اسم الشركة/الاستعلام
  const validation = validateCompanyName(query);
  let cleanedQuery = query;
  
  if (!validation.valid) {
    console.warn('[Leedz] Query validation failed:', validation.reason);
    // محاولة تنظيف الاسم بدلاً من الفشل
    cleanedQuery = cleanCompanyName(query);
    if (cleanedQuery.length < 2) {
      await markJobComplete(jobId, { status: 'FAILED', error: `استعلام غير صالح: ${validation.reason}` });
      throw new Error(`Invalid query: ${validation.reason}`);
    }
    console.log('[Leedz] Query cleaned:', cleanedQuery);
  } else if (validation.cleaned) {
    cleanedQuery = validation.cleaned;
    console.log('[Leedz] Query cleaned:', cleanedQuery);
  }
  
  // Notify side panel that job started
  broadcastToSidePanel({
    type: 'JOB_STARTED',
    job: {
      id: jobId,
      type: searchType === 'SINGLE' ? 'SEARCH_SINGLE' : 'SEARCH_BULK',
      status: 'RUNNING',
      progress: 0,
      query,
      city,
    },
  });
  
  try {
    // Step 1: Initialize (5%)
    await updateJobProgress(jobId, 5, 'جاري تهيئة البحث...');
    
    // Use platform config for defaults
    const defaultCountry = platformConfig?.defaultCountry || 'السعودية';
    const defaultMaxResults = platformConfig?.maxSearchResults || 30;
    const finalMaxResults = maxResults || defaultMaxResults;
    const finalSearchType = searchType || 'BULK';
    
    // Progress callback for detailed updates
    const onProgress = async (progress, message) => {
      await updateJobProgress(jobId, progress, message);
      broadcastToSidePanel({
        type: 'JOB_PROGRESS',
        jobId,
        progress,
        message,
      });
    };
    
    // Step 2: Execute search with progress updates
    await onProgress(10, 'جاري فتح نافذة البحث...');
    
    const results = await searchGoogleMaps({
      query: cleanedQuery, // استخدام الاستعلام المنظف
      city,
      country: country || defaultCountry,
      searchType: finalSearchType,
      maxResults: finalMaxResults,
      onProgress,
      originalQuery: cleanedQuery, // تمرير الاسم الأصلي لاستخدامه في جميع الخطوات
    });
    
    console.log('[Leedz] Search completed, found:', results.length, 'results');
    
    // Step 3: Apply Smart Matching for SINGLE search
    let validatedResults = results;
    
    if (finalSearchType === 'SINGLE' && results.length > 0) {
      await onProgress(65, 'جاري التحقق من التطابق الذكي...');
      
      // Get settings for match threshold
      const settingsData = await getStorageData(['leedz_extension_settings']);
      const settings = settingsData.leedz_extension_settings || {};
      const threshold = settings.matchThreshold || MATCH_THRESHOLD;
      
      console.log('[Leedz] Applying smart match with threshold:', threshold);
      
      // Filter results by smart match
      const searchQuery = { name: cleanedQuery, query: cleanedQuery, city };
      validatedResults = filterResultsBySmartMatch(searchQuery, results, threshold);
      
      console.log('[Leedz] Smart match results:', validatedResults.length, 'of', results.length);
      
      if (validatedResults.length === 0) {
        // لم يتم العثور على تطابق دقيق في Maps
        // لا نتوقف هنا! نكمل للبحث في Google بالاسم الأصلي
        console.log('[Leedz] No results met the match threshold in Maps, will try Google Search with original query:', cleanedQuery);
        await onProgress(65, `لم يتم العثور على تطابق في الخرائط، جاري البحث في جوجل...`);
        // لا نعيد return هنا - نترك الكود يكمل للـ Google fallback
      } else {
        // Log best match details
        const bestMatch = validatedResults[0];
        console.log('[Leedz] Best match:', bestMatch.name, 'Score:', bestMatch.matchScore);
      }
    }
    
    // Step 3b: Validate results - إذا لم نجد نتائج، نبحث في Google مباشرة
    if (validatedResults.length === 0) {
      console.log('[Leedz] No Maps results found, trying Google Search fallback...');
      
      // التحقق من إيقاف البحث
      if (currentSearchAborted) {
        console.log('[Leedz] Search aborted by user');
        currentJobId = null;
        return;
      }
      
      await onProgress(70, 'لم يتم العثور في الخرائط، جاري البحث في جوجل...');
      
      // ========== Layer 2: البحث في Google مباشرة ==========
      try {
        // إنشاء تاب للبحث في جوجل
        const googleSearchQuery = `${cleanedQuery} ${city || ''}`.trim();
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery)}`;
        
        console.log('[Leedz] Google Search Fallback - searching for original query:', cleanedQuery);
        console.log('[Leedz] Google Search URL:', googleSearchUrl);
        
        const tab = await createExecutionTab(googleSearchUrl);
        await waitForTabLoad(tab.id, 15000);
        await delay(2500); // انتظار أطول لتحميل النتائج
        
        // التحقق من إيقاف البحث
        if (currentSearchAborted) {
          console.log('[Leedz] Search aborted by user');
          currentJobId = null;
          return;
        }
        
        // استخراج نتائج البحث من جوجل مباشرة (الصفحة محملة بالفعل)
        console.log('[Leedz] Extracting Google Search results for:', cleanedQuery);
        const googleResults = await extractGoogleSearchResults(tab.id, cleanedQuery);
        
        console.log('[Leedz] Google Search results:', googleResults);
        
        if (googleResults && (googleResults.officialWebsite || Object.keys(googleResults.socialLinks || {}).length > 0)) {
          // وجدنا معلومات من جوجل
          await onProgress(80, 'تم العثور على معلومات من جوجل، جاري الاستخراج...');
          
          let googleResult = {
            name: cleanedQuery,
            originalSearchQuery: cleanedQuery, // حفظ الاسم الأصلي
            website: googleResults.officialWebsite,
            socialLinks: googleResults.socialLinks || {},
            source: 'GOOGLE_SEARCH',
            matchScore: 75,
          };
          
          // التحقق من إيقاف البحث
          if (currentSearchAborted) {
            console.log('[Leedz] Search aborted by user');
            currentJobId = null;
            return;
          }
          
          // Layer 3: فحص الموقع إذا وجدناه
          if (googleResult.website) {
            await onProgress(85, 'جاري فحص الموقع الإلكتروني...');
            try {
              const websiteData = await scrapeWebsite(googleResult.website, tab.id);
              if (websiteData) {
                googleResult.email = websiteData.emails?.[0];
                googleResult.allEmails = websiteData.emails || [];
                googleResult.phone = websiteData.phones?.[0];
                googleResult.allPhones = websiteData.phones || [];
                googleResult.description = websiteData.description;
                googleResult.address = websiteData.address;
                console.log('[Leedz] Website data extracted:', websiteData);
              }
            } catch (e) {
              console.error('[Leedz] Website scrape error:', e);
            }
          }
          
          // التحقق من إيقاف البحث
          if (currentSearchAborted) {
            console.log('[Leedz] Search aborted by user');
            currentJobId = null;
            return;
          }
          
          // Layer 4: فحص السوشيال ميديا
          if (Object.keys(googleResult.socialLinks).length > 0) {
            await onProgress(90, 'جاري تحليل حسابات التواصل الاجتماعي...');
            try {
              const socialData = await scrapeSocialProfiles(googleResult.socialLinks, tab.id);
              if (socialData) {
                googleResult.socialProfiles = socialData.profiles || socialData;
                googleResult.totalFollowers = socialData.totalFollowers;
                googleResult.latestSocialActivity = socialData.latestActivity;
                console.log('[Leedz] Social data extracted:', socialData);
              }
            } catch (e) {
              console.error('[Leedz] Social scrape error:', e);
            }
          }
          
          // استخدام النتيجة من جوجل
          validatedResults = [googleResult];
          console.log('[Leedz] Created result from Google Search:', googleResult);
        } else {
          // لم نجد أي شيء في جوجل أيضاً
          console.log('[Leedz] No results from Google Search either');
          await onProgress(95, 'لم يتم العثور على نتائج');
          
          await markJobComplete(jobId, {
            status: 'SUCCESS',
            resultsCount: 0,
            savedCount: 0,
            searchType: finalSearchType,
            duration: Date.now() - startTime,
            message: 'لم يتم العثور على نتائج في الخرائط أو جوجل',
          });
          
          broadcastToSidePanel({
            type: 'JOB_COMPLETED',
            jobId,
            results: [],
            savedCount: 0,
            message: 'لم يتم العثور على نتائج',
          });
          
          currentJobId = null;
          return;
        }
      } catch (googleError) {
        console.error('[Leedz] Google Search fallback failed:', googleError);
        
        await markJobComplete(jobId, {
          status: 'SUCCESS',
          resultsCount: 0,
          savedCount: 0,
          searchType: finalSearchType,
          duration: Date.now() - startTime,
          message: 'لم يتم العثور على نتائج',
        });
        
        broadcastToSidePanel({
          type: 'JOB_COMPLETED',
          jobId,
          results: [],
          savedCount: 0,
          message: 'لم يتم العثور على نتائج',
        });
        
        currentJobId = null;
        return;
      }
    }
    
    // Step 4: Save leads to database
    await onProgress(70, `تم العثور على ${validatedResults.length} نتيجة، جاري الحفظ...`);
    
    // ========== DEBUG: Log all data before saving ==========
    console.log('[Leedz Save] ========== PREPARING TO SAVE ==========');
    validatedResults.forEach((r, i) => {
      console.log(`[Leedz Save] Result ${i + 1}:`, {
        name: r.name,
        email: r.email,
        allEmails: r.allEmails,
        phone: r.phone,
        allPhones: r.allPhones,
        totalFollowers: r.totalFollowers,
        totalSocialPosts: r.totalSocialPosts,
        latestSocialActivity: r.latestSocialActivity,
        socialProfiles: r.socialProfiles ? Object.keys(r.socialProfiles) : [],
        dataCompleteness: r.dataCompleteness,
      });
    });
    
    const leads = validatedResults.map(r => ({
      // في البحث SINGLE نستخدم الاسم الأصلي المُدخل من المستخدم
      // نستخدم originalSearchQuery إذا وجد، وإلا cleanedQuery
      companyName: finalSearchType === 'SINGLE' ? (r.originalSearchQuery || cleanedQuery) : r.name,
      industry: finalSearchType === 'SINGLE' ? null : query,
      city: city || null,
      phone: r.phone || null,
      email: r.email || null,
      website: r.website || null,
      address: r.address || null,
      source: 'GOOGLE_MAPS_SEARCH',
      jobId: jobId,
      metadata: {
        rating: r.rating,
        reviews: r.reviews,
        reviewCount: parseInt(r.reviews) || null,
        type: r.type,
        sourceUrl: r.sourceUrl,
        googleMapsUrl: r.sourceUrl,
        matchScore: r.matchScore,
        searchQuery: query,
        searchCity: city,
        // بيانات البحث المتعدد الطبقات
        socialLinks: r.socialLinks || {},
        socialProfiles: r.socialProfiles || {},
        allEmails: r.allEmails || [],
        allPhones: r.allPhones || [],
        description: r.description || null,
        dataCompleteness: r.dataCompleteness || null,
        strongestPlatform: r.strongestPlatform || null,
        totalFollowers: r.totalFollowers || null,
        // ========== بيانات جديدة ==========
        latestSocialActivity: r.latestSocialActivity || null,
        totalSocialPosts: r.totalSocialPosts || null,
        responseTime: r.responseTime || null,
        workingHours: r.workingHours || null,
        services: r.services || [],
        externalLinks: r.externalLinks || [],
        dataSources: r.dataSources || {},
      },
    }));
    
    console.log('[Leedz Save] Lead to save:', JSON.stringify(leads[0], null, 2));
    
    console.log('[Leedz] Preparing to save', leads.length, 'leads');
    
    let savedCount = 0;
    let saveError = null;
    
    // Try to save with retry
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log('[Leedz] Save attempt', attempt);
        const saveResult = await apiRequest('/leads/bulk', {
          method: 'POST',
          body: JSON.stringify(leads),
        });
        savedCount = saveResult?.count || leads.length;
        console.log('[Leedz] ✓ Leads saved successfully:', savedCount);
        break;
      } catch (err) {
        console.error('[Leedz] Save attempt', attempt, 'failed:', err.message);
        saveError = err;
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
        }
      }
    }
    
    if (savedCount > 0) {
      await onProgress(90, `تم حفظ ${savedCount} نتيجة بنجاح`);
    } else if (saveError) {
      console.error('[Leedz] All save attempts failed');
      await onProgress(90, `تم العثور على ${results.length} نتيجة (فشل الحفظ)`);
    }
    
    // Step 5: Save search history to database
    await onProgress(92, 'جاري حفظ سجل البحث...');
    
    try {
      await saveSearchHistory({
        query,
        city,
        country: country || platformConfig?.defaultCountry || 'السعودية',
        searchType: finalSearchType,
        resultsCount: results.length,
        savedCount,
        results: validatedResults,
        searchLayers: ['googleMaps'],
        matchThreshold: platformConfig?.matchThreshold,
        duration: Date.now() - startTime,
        status: 'COMPLETED',
        jobId,
      });
      console.log('[Leedz] ✓ Search history saved');
    } catch (historyError) {
      console.error('[Leedz] Failed to save search history:', historyError.message);
    }
    
    // Step 6: Mark job complete
    await onProgress(95, 'جاري إنهاء العملية...');
    
    await markJobComplete(jobPlan.jobId, {
      status: 'SUCCESS',
      resultsCount: results.length,
      savedCount,
      searchType: searchType || 'BULK',
      duration: Date.now() - activeJobs.get(jobPlan.jobId)?.startedAt || 0,
    });
    
    console.log('[Leedz] Job completed successfully');
    
    // Save results to chrome.storage.local for persistence across refreshes
    try {
      await chrome.storage.local.set({
        leedz_cached_results: {
          results: validatedResults,
          searchType: finalSearchType,
          timestamp: Date.now(),
          query,
          city,
        }
      });
      console.log('[Leedz] ✓ Results cached in storage:', validatedResults.length);
    } catch (cacheError) {
      console.error('[Leedz] Failed to cache results:', cacheError.message);
    }
    
    broadcastToSidePanel({
      type: 'JOB_COMPLETED',
      jobId,
      results: validatedResults,
      searchType: finalSearchType,
      savedCount,
      duration: Date.now() - startTime,
    });
    
    console.log('[Leedz] ============================================');
    console.log('[Leedz] JOB COMPLETED SUCCESSFULLY');
    console.log('[Leedz] Results found:', results.length);
    console.log('[Leedz] Results saved:', savedCount);
    console.log('[Leedz] Duration:', Math.round((Date.now() - startTime) / 1000), 'seconds');
    console.log('[Leedz] ============================================');
    
    // تنظيف حالة البحث
    currentJobId = null;
    currentSearchAborted = false;
    
  } catch (error) {
    console.error('[Leedz] ============================================');
    console.error('[Leedz] SEARCH JOB FAILED');
    console.error('[Leedz] Error:', error.message);
    console.error('[Leedz] Stack:', error.stack);
    console.error('[Leedz] ============================================');
    
    await markJobComplete(jobId, {
      status: 'FAILED',
      error: error.message,
      duration: Date.now() - startTime,
    });
    
    broadcastToSidePanel({
      type: 'JOB_FAILED',
      jobId,
      error: error.message,
    });
    
    throw error;
  } finally {
    // تنظيف حالة البحث في جميع الحالات
    currentJobId = null;
    currentSearchAborted = false;
    
    // Close execution window after job completes (optional - can be controlled)
    // Uncomment the next line to auto-close the window after search
    // await closeExecutionWindow();
  }
}

function broadcastToSidePanel(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Side panel might not be open
  });
}

// ==================== Side Panel Setup ====================

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ==================== Initialization ====================

(async () => {
  console.log('[Leedz Extension] Initializing...');
  
  // 1. Fetch platform config
  await fetchPlatformConfig();
  
  // 2. Check existing auth
  const { [STORAGE_KEYS.AUTH_TOKEN]: token } = await getStorageData([STORAGE_KEYS.AUTH_TOKEN]);
  
  if (token) {
    // Verify existing token
    try {
      await apiRequest('/auth/me');
      console.log('[Leedz] Existing token valid, starting polling and WebSocket');
      startPolling(); // Start polling first (more reliable)
      await connectWebSocket(); // WebSocket as backup
    } catch (e) {
      console.log('[Leedz] Existing token invalid, will try auto-login');
      await clearStorageData();
      // Try auto-login
      if (platformConfig.extensionAutoLogin) {
        await checkPlatformLogin();
      }
    }
  } else if (platformConfig.extensionAutoLogin) {
    // Try auto-login from platform
    console.log('[Leedz] No token, attempting auto-login from platform');
    await checkPlatformLogin();
  }
  
  console.log('[Leedz Extension] Initialization complete');
})();

console.log('[Leedz Extension] Background service worker loaded');

// ==================== Deep Search (Multi-Layer with Social Media) ====================

/**
 * البحث الشامل متعدد الطبقات
 * يجمع بيانات من Google Maps + Google Search + Social Media
 * @param {Object} companyData - بيانات الشركة الأساسية
 * @returns {Promise<Object>} - نتائج البحث الشاملة
 */
async function executeDeepSearch(companyData) {
  const { companyName, city, industry, website, socialLinks } = companyData;
  
  console.log('[Leedz] ========== DEEP SEARCH STARTED ==========');
  console.log('[Leedz] Company:', companyName);
  console.log('[Leedz] City:', city);
  
  const result = {
    success: false,
    companyName,
    sources: [],
    data: {
      basic: companyData,
      googleMaps: null,
      googleSearch: null,
      socialProfiles: {},
    },
    searchTime: 0,
  };
  
  const startTime = Date.now();
  
  try {
    // التحقق من صحة الاسم
    const validation = validateCompanyName(companyName);
    if (!validation.valid && !validation.cleaned) {
      return { success: false, error: validation.reason };
    }
    const cleanedName = validation.cleaned || companyName;
    
    // إنشاء نافذة البحث (مخفية)
    await ensureExecutionWindow();
    
    // ==================== Layer 1: Google Maps ====================
    console.log('[Leedz] Layer 1: Google Maps Search');
    try {
      const mapsResult = await searchGoogleMapsForDeepSearch(cleanedName, city);
      if (mapsResult && mapsResult.success) {
        result.data.googleMaps = mapsResult.data;
        result.sources.push('googleMaps');
        console.log('[Leedz] Google Maps: Found data');
      }
    } catch (e) {
      console.error('[Leedz] Google Maps error:', e);
    }
    
    // ==================== Layer 2: Google Search ====================
    console.log('[Leedz] Layer 2: Google Search');
    try {
      const googleResult = await searchGoogleForDeepSearch(cleanedName, city);
      if (googleResult && googleResult.success) {
        result.data.googleSearch = googleResult.data;
        result.sources.push('googleSearch');
        console.log('[Leedz] Google Search: Found data');
      }
    } catch (e) {
      console.error('[Leedz] Google Search error:', e);
    }
    
    // ==================== Layer 3: Website Deep Scraping ====================
    // فحص الموقع الإلكتروني لاستخراج البريد والهاتف والسوشيال
    const websiteUrl = website || result.data.googleMaps?.website || result.data.googleSearch?.officialWebsite;
    let websiteData = null;
    
    if (websiteUrl) {
      console.log('[Leedz] Layer 3: Website Deep Scraping');
      console.log('[Leedz] Website URL:', websiteUrl);
      
      try {
        // الحصول على tab للفحص - نستخدم executionTabId الموجود
        if (executionTabId) {
          websiteData = await scrapeWebsite(websiteUrl, executionTabId);
          if (websiteData) {
            result.data.websiteData = websiteData;
            result.sources.push('websiteScraping');
            console.log('[Leedz] Website scraping complete:', {
              emails: websiteData.emails?.length || 0,
              phones: websiteData.phones?.length || 0,
              socialLinks: Object.keys(websiteData.socialLinks || {}).length,
            });
            
            // دمج البريد في basic
            if (websiteData.emails?.length > 0) {
              result.data.basic.email = websiteData.emails[0];
              result.data.basic.allEmails = websiteData.emails;
              console.log('[Leedz] ✓ Email found from website:', websiteData.emails[0]);
            }
            
            // دمج الهاتف
            if (websiteData.phones?.length > 0 && !result.data.basic.phone) {
              result.data.basic.phone = websiteData.phones[0];
              result.data.basic.allPhones = websiteData.phones;
            }
          }
        }
      } catch (e) {
        console.error('[Leedz] Website scraping error:', e);
      }
    } else {
      console.log('[Leedz] No website URL found to scrape');
    }
    
    // ==================== Layer 4: Social Media Scraping ====================
    // جمع روابط السوشيال من جميع المصادر
    const allSocialLinks = {
      ...(socialLinks || {}),
      ...(result.data.googleMaps?.links || {}),
      ...(result.data.googleSearch?.socialLinks || {}),
      ...(websiteData?.socialLinks || {}),
    };
    
    const socialPlatforms = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube'];
    const foundSocialLinks = {};
    
    for (const platform of socialPlatforms) {
      if (allSocialLinks[platform]) {
        foundSocialLinks[platform] = allSocialLinks[platform];
      }
    }
    
    if (Object.keys(foundSocialLinks).length > 0) {
      console.log('[Leedz] Layer 3: Social Media Scraping');
      console.log('[Leedz] Found social links:', Object.keys(foundSocialLinks));
      
      for (const [platform, url] of Object.entries(foundSocialLinks)) {
        try {
          console.log(`[Leedz] Scraping ${platform}: ${url}`);
          const socialData = await scrapeSocialProfile(platform, url);
          if (socialData) {
            result.data.socialProfiles[platform] = socialData;
            if (!result.sources.includes('socialMedia')) {
              result.sources.push('socialMedia');
            }
          }
        } catch (e) {
          console.error(`[Leedz] ${platform} scraping error:`, e);
        }
      }
    }
    
    // ==================== Compile Results ====================
    result.success = result.sources.length > 0;
    result.searchTime = Date.now() - startTime;
    
    // إنشاء ملخص شامل
    result.summary = generateDeepSearchSummary(result.data);
    
    console.log('[Leedz] ========== DEEP SEARCH COMPLETE ==========');
    console.log('[Leedz] Sources:', result.sources);
    console.log('[Leedz] Time:', result.searchTime, 'ms');
    
    return result;
    
  } catch (error) {
    console.error('[Leedz] Deep search error:', error);
    result.error = error.message;
    result.searchTime = Date.now() - startTime;
    return result;
  }
}

/**
 * البحث في Google Maps للبحث الشامل
 */
async function searchGoogleMapsForDeepSearch(query, city) {
  try {
    let searchQuery = `"${query}"`;
    if (city) searchQuery += ` ${city}`;
    
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
    const tab = await createExecutionTab(searchUrl);
    
    await waitForTabLoad(tab.id, TIMING.PAGE_LOAD_TIMEOUT);
    await delay(TIMING.RESULTS_WAIT);
    
    // استخراج البيانات
    const data = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const result = {
          name: null,
          phone: null,
          website: null,
          address: null,
          rating: null,
          reviews: null,
          category: null,
          links: {},
        };
        
        // الاسم
        const nameEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge');
        result.name = nameEl?.textContent?.trim();
        
        // الهاتف
        const phoneEl = document.querySelector('a[href^="tel:"]');
        if (phoneEl) {
          result.phone = phoneEl.getAttribute('href')?.replace('tel:', '');
        }
        
        // الموقع
        const websiteEl = document.querySelector('a[data-item-id*="authority"]');
        if (websiteEl) {
          result.website = websiteEl.getAttribute('href');
        }
        
        // العنوان
        const addressEl = document.querySelector('button[data-item-id*="address"]');
        result.address = addressEl?.getAttribute('aria-label')?.replace(/^عنوان:\s*/i, '');
        
        // التقييم
        const ratingEl = document.querySelector('.F7nice span[aria-hidden="true"]');
        result.rating = ratingEl?.textContent?.trim();
        
        // المراجعات
        const reviewsEl = document.querySelector('span[aria-label*="مراجع"], span[aria-label*="review"]');
        const reviewMatch = reviewsEl?.getAttribute('aria-label')?.match(/(\d[\d,]*)/);
        result.reviews = reviewMatch ? reviewMatch[1].replace(/,/g, '') : null;
        
        // الفئة
        const categoryEl = document.querySelector('button[jsaction*="category"]');
        result.category = categoryEl?.textContent?.trim();
        
        // روابط السوشيال من الصفحة
        const pageText = document.body.innerHTML;
        const socialPatterns = {
          instagram: /instagram\.com\/([^\/\s"'<>]+)/i,
          twitter: /(?:twitter|x)\.com\/([^\/\s"'<>]+)/i,
          facebook: /facebook\.com\/([^\/\s"'<>]+)/i,
          linkedin: /linkedin\.com\/(?:company|in)\/([^\/\s"'<>]+)/i,
          tiktok: /tiktok\.com\/@([^\/\s"'<>]+)/i,
        };
        
        for (const [platform, pattern] of Object.entries(socialPatterns)) {
          const match = pageText.match(pattern);
          if (match) {
            result.links[platform] = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;
          }
        }
        
        return result;
      },
    });
    
    return { success: true, data: data[0]?.result };
    
  } catch (error) {
    console.error('[Leedz] Google Maps deep search error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * البحث في Google Search للبحث الشامل
 */
async function searchGoogleForDeepSearch(query, city) {
  try {
    const searchQuery = city ? `${query} ${city}` : query;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=ar`;
    
    const tab = await createExecutionTab(searchUrl);
    await waitForTabLoad(tab.id, TIMING.PAGE_LOAD_TIMEOUT);
    await delay(TIMING.RESULTS_WAIT);
    
    const data = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const result = {
          officialWebsite: null,
          socialLinks: {},
          knowledgePanel: null,
        };
        
        const BLACKLIST = ['google.com', 'youtube.com', 'wikipedia.org', 'yelp.com'];
        const SOCIAL_PATTERNS = {
          instagram: /instagram\.com\/([^\/\?]+)/i,
          twitter: /(?:twitter|x)\.com\/([^\/\?]+)/i,
          facebook: /facebook\.com\/([^\/\?]+)/i,
          linkedin: /linkedin\.com\/(?:company|in)\/([^\/\?]+)/i,
          tiktok: /tiktok\.com\/@([^\/\?]+)/i,
        };
        
        // استخراج من نتائج البحث
        const searchResults = document.querySelectorAll('#search .g, #rso .g');
        const candidates = [];
        
        searchResults.forEach((res, index) => {
          const link = res.querySelector('a[href]');
          if (!link) return;
          
          const href = link.href;
          if (!href || href.startsWith('javascript:')) return;
          
          // Social Media
          for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
            if (pattern.test(href) && !result.socialLinks[platform]) {
              result.socialLinks[platform] = href;
            }
          }
          
          // Website candidate
          const isBlacklisted = BLACKLIST.some(d => href.includes(d));
          const isSocial = Object.values(SOCIAL_PATTERNS).some(p => p.test(href));
          
          if (!isBlacklisted && !isSocial) {
            candidates.push({ url: href, score: 100 - (index * 10) });
          }
        });
        
        // أفضل موقع
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.score - a.score);
          result.officialWebsite = candidates[0].url;
        }
        
        // Knowledge Panel
        const kp = document.querySelector('#rhs, .kp-wholepage');
        if (kp) {
          const kpLinks = kp.querySelectorAll('a[href]');
          kpLinks.forEach(link => {
            for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
              if (pattern.test(link.href) && !result.socialLinks[platform]) {
                result.socialLinks[platform] = link.href;
              }
            }
          });
          
          // معلومات Knowledge Panel
          const kpTitle = kp.querySelector('h2[data-attrid="title"]');
          const kpDesc = kp.querySelector('[data-attrid="description"] span');
          if (kpTitle || kpDesc) {
            result.knowledgePanel = {
              title: kpTitle?.textContent?.trim(),
              description: kpDesc?.textContent?.trim(),
            };
          }
        }
        
        return result;
      },
    });
    
    return { success: true, data: data[0]?.result };
    
  } catch (error) {
    console.error('[Leedz] Google Search deep search error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * استخراج بيانات من جميع صفحات السوشيال ميديا
 * @param {Object} socialLinks - روابط السوشيال {platform: url}
 * @param {number} tabId - معرف التاب (غير مستخدم حالياً)
 * @returns {Object} - بيانات السوشيال
 */
async function scrapeSocialProfiles(socialLinks, tabId) {
  console.log('[Leedz Social] ========== STARTING SOCIAL PROFILES SCRAPE ==========');
  console.log('[Leedz Social] Social links to scrape:', socialLinks);
  
  const result = {
    profiles: {},
    totalFollowers: 0,
    latestActivity: null,
  };
  
  if (!socialLinks || Object.keys(socialLinks).length === 0) {
    console.log('[Leedz Social] No social links to scrape');
    return result;
  }
  
  for (const [platform, url] of Object.entries(socialLinks)) {
    if (!url) continue;
    
    try {
      console.log(`[Leedz Social] Scraping ${platform}: ${url}`);
      const profileData = await scrapeSocialProfile(platform, url);
      
      if (profileData) {
        result.profiles[platform] = profileData;
        
        // حساب إجمالي المتابعين
        if (profileData.followers) {
          result.totalFollowers += profileData.followers;
        }
        
        // تحديث آخر نشاط
        if (profileData.latestPost && (!result.latestActivity || profileData.latestPost > result.latestActivity)) {
          result.latestActivity = profileData.latestPost;
        }
        
        console.log(`[Leedz Social] ${platform} data extracted:`, profileData);
      }
    } catch (error) {
      console.error(`[Leedz Social] ${platform} scrape error:`, error);
    }
  }
  
  console.log('[Leedz Social] ========== SOCIAL SCRAPE COMPLETE ==========');
  console.log('[Leedz Social] Total profiles scraped:', Object.keys(result.profiles).length);
  console.log('[Leedz Social] Total followers:', result.totalFollowers);
  
  return result;
}

/**
 * استخراج بيانات من صفحة سوشيال ميديا
 */
async function scrapeSocialProfile(platform, url) {
  let tab = null;
  try {
    console.log(`[Leedz Social] Opening ${platform}: ${url}`);
    tab = await createExecutionTab(url);
    await waitForTabLoad(tab.id, TIMING.PAGE_LOAD_TIMEOUT);
    await delay(3000); // انتظار تحميل المحتوى الديناميكي
    
    // عمل scroll للصفحة لتحميل المنشورات والمحتوى الديناميكي
    console.log(`[Leedz Social] Scrolling ${platform} page...`);
    await scrollSocialPage(tab.id, platform);
    
    const scrapers = {
      instagram: scrapeInstagramProfile,
      twitter: scrapeTwitterProfile,
      facebook: scrapeFacebookProfile,
      linkedin: scrapeLinkedInProfile,
      tiktok: scrapeTikTokProfile,
      youtube: scrapeYouTubeProfile,
    };
    
    const scraper = scrapers[platform];
    if (!scraper) {
      console.log(`[Leedz Social] No scraper for platform: ${platform}`);
      return null;
    }
    
    console.log(`[Leedz Social] Executing scraper for ${platform}`);
    const data = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scraper,
    });
    
    const result = data[0]?.result;
    if (result) {
      result.platform = platform;
      result.url = url;
      result.scrapedAt = new Date().toISOString();
      console.log(`[Leedz Social] ${platform} scraped successfully:`, result);
    } else {
      console.log(`[Leedz Social] ${platform} returned no data`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`[Leedz Social] ${platform} scrape error:`, error);
    return null;
  } finally {
    // Always close the tab
    if (tab) {
      try {
        await chrome.tabs.remove(tab.id);
        console.log(`[Leedz Social] Tab closed for ${platform}`);
      } catch (e) {
        // Tab might already be closed
      }
    }
  }
}

/**
 * عمل scroll لصفحات السوشيال ميديا لتحميل المنشورات والمحتوى
 */
async function scrollSocialPage(tabId, platform) {
  console.log(`[Leedz Social Scroll] Starting scroll for ${platform}...`);
  
  try {
    // عدد خطوات الـ scroll حسب المنصة
    const scrollSteps = platform === 'facebook' ? 10 : 6;
    
    for (let step = 0; step < scrollSteps; step++) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (stepNum) => {
          window.scrollBy(0, 600);
          console.log(`[Leedz Social Scroll] Step ${stepNum + 1} - scrolled to:`, window.scrollY);
        },
        args: [step],
      });
      await delay(300);
    }
    
    // انتظار تحميل المحتوى
    await delay(1000);
    
    // العودة للأعلى لقراءة البيانات الأساسية
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.scrollTo(0, 0);
        console.log('[Leedz Social Scroll] Scrolled back to top');
      },
    });
    
    await delay(500);
    console.log(`[Leedz Social Scroll] ✓ Scroll complete for ${platform}`);
    
  } catch (e) {
    console.error(`[Leedz Social Scroll] Error for ${platform}:`, e.message);
  }
}

// ==================== Social Media Scrapers ====================

function scrapeInstagramProfile() {
  const data = {
    username: null,
    displayName: null,
    bio: null,
    followers: null,
    following: null,
    posts: null,
    isVerified: false,
    externalUrl: null,
    email: null,
    phone: null,
    lastPostDate: null,
    recentPostsCount: 0,
  };
  
  try {
    // اسم المستخدم
    const usernameEl = document.querySelector('header h2, header h1, [class*="username"]');
    data.username = usernameEl?.textContent?.trim();
    
    // الإحصائيات
    const statsEls = document.querySelectorAll('header section ul li, header ul li, [class*="stats"] li');
    statsEls.forEach(li => {
      const text = li.textContent?.toLowerCase() || '';
      const numMatch = text.match(/[\d,\.]+[KMكم]?/i);
      const numText = numMatch ? numMatch[0] : '';
      
      if (text.includes('follower') || text.includes('متابع')) {
        data.followers = numText || li.textContent?.trim();
      } else if (text.includes('following') || text.includes('يتابع')) {
        data.following = numText || li.textContent?.trim();
      } else if (text.includes('post') || text.includes('منشور')) {
        data.posts = numText || li.textContent?.trim();
      }
    });
    
    // البايو
    const bioEl = document.querySelector('header section > div > span, [class*="biography"], header span[dir="auto"]');
    const bioText = bioEl?.textContent?.trim() || '';
    data.bio = bioText;
    
    // استخراج البريد من البايو
    const emailMatch = bioText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) data.email = emailMatch[0];
    
    // استخراج الهاتف من البايو
    const phoneMatch = bioText.match(/(?:\+?966|0)[\s-]?5[\d\s-]{8,}/);
    if (phoneMatch) data.phone = phoneMatch[0].replace(/[\s-]/g, '');
    
    // التوثيق
    data.isVerified = !!document.querySelector('header svg[aria-label*="Verified"], [title*="Verified"]');
    
    // الرابط الخارجي
    const linkEl = document.querySelector('header a[href*="l.instagram.com"], a[href*="linktr.ee"], a[href*="bio.link"]');
    data.externalUrl = linkEl?.href || linkEl?.textContent?.trim();
    
    // محاولة استخراج تاريخ آخر منشور
    const timeEls = document.querySelectorAll('time[datetime]');
    if (timeEls.length > 0) {
      data.lastPostDate = timeEls[0].getAttribute('datetime');
    }
    
    // عدد المنشورات المرئية
    const postEls = document.querySelectorAll('article a[href*="/p/"], [class*="post"] a');
    data.recentPostsCount = postEls.length;
    
  } catch (e) {
    console.error('[Leedz Instagram] Scrape error:', e);
  }
  
  return data;
}

function scrapeTwitterProfile() {
  const data = {
    username: null,
    displayName: null,
    bio: null,
    followers: null,
    following: null,
    tweets: null,
    isVerified: false,
    website: null,
    location: null,
    joinDate: null,
    email: null,
    phone: null,
    lastTweetDate: null,
    recentTweetsCount: 0,
  };
  
  try {
    // اسم المستخدم
    const usernameEl = document.querySelector('[data-testid="UserName"] div + div span, [data-testid="UserName"] span[class*="r-"]');
    data.username = usernameEl?.textContent?.trim();
    
    // الاسم المعروض
    const nameEl = document.querySelector('[data-testid="UserName"] span span');
    data.displayName = nameEl?.textContent?.trim();
    
    // البايو
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    const bioText = bioEl?.textContent?.trim() || '';
    data.bio = bioText;
    
    // استخراج البريد من البايو
    const emailMatch = bioText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) data.email = emailMatch[0];
    
    // استخراج الهاتف من البايو
    const phoneMatch = bioText.match(/(?:\+?966|0)[\s-]?5[\d\s-]{8,}/);
    if (phoneMatch) data.phone = phoneMatch[0].replace(/[\s-]/g, '');
    
    // الإحصائيات
    const statsLinks = document.querySelectorAll('[href*="/following"], [href*="/followers"], [href*="/verified_followers"]');
    statsLinks.forEach(link => {
      const text = link.textContent || '';
      const href = link.href || '';
      const numMatch = text.match(/[\d,\.]+[KMكم]?/i);
      
      if (href.includes('/followers') || href.includes('/verified_followers')) {
        data.followers = numMatch ? numMatch[0] : text.replace(/followers?/i, '').trim();
      } else if (href.includes('/following')) {
        data.following = numMatch ? numMatch[0] : text.replace(/following/i, '').trim();
      }
    });
    
    // عدد التغريدات
    const pageText = document.body?.innerText || '';
    const tweetsMatch = pageText.match(/(\d[\d,\.]*)\s*(?:posts?|tweets?|تغريد)/i);
    if (tweetsMatch) data.tweets = tweetsMatch[1];
    
    // التوثيق
    data.isVerified = !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"], [aria-label*="verified"]');
    
    // الموقع
    const websiteEl = document.querySelector('[data-testid="UserProfileHeader_Items"] a[href*="t.co"], [data-testid="UserUrl"] a');
    data.website = websiteEl?.textContent?.trim();
    
    // الموقع الجغرافي
    const locationEl = document.querySelector('[data-testid="UserLocation"], [data-testid="UserProfileHeader_Items"] span[data-testid="UserLocation"]');
    data.location = locationEl?.textContent?.trim();
    
    // تاريخ الانضمام
    const joinEl = document.querySelector('[data-testid="UserJoinDate"]');
    data.joinDate = joinEl?.textContent?.trim();
    
    // آخر تغريدة
    const tweetTimeEls = document.querySelectorAll('article time[datetime]');
    if (tweetTimeEls.length > 0) {
      data.lastTweetDate = tweetTimeEls[0].getAttribute('datetime');
    }
    
    // عدد التغريدات المرئية
    const tweetEls = document.querySelectorAll('article[data-testid="tweet"]');
    data.recentTweetsCount = tweetEls.length;
    
  } catch (e) {
    console.error('[Leedz Twitter] Scrape error:', e);
  }
  
  return data;
}

function scrapeFacebookProfile() {
  const data = {
    pageName: null,
    category: null,
    followers: null,
    likes: null,
    isVerified: false,
    about: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    lastPostDate: null,
    recentPostsCount: 0,
    responseTime: null,
    workingHours: null,
  };
  
  try {
    // اسم الصفحة
    const nameEl = document.querySelector('h1[dir="auto"], [role="main"] h1, h1');
    data.pageName = nameEl?.textContent?.trim();
    
    // الفئة
    const categoryEl = document.querySelector('h1 + div a, [role="main"] a[href*="/pages/category/"], a[href*="category"]');
    data.category = categoryEl?.textContent?.trim();
    
    // المتابعين والإعجابات - بحث أوسع
    const pageText = document.body?.innerText || '';
    
    // البحث عن المتابعين
    const followersMatch = pageText.match(/(\d[\d,\.]*\s*(?:K|M|ألف|مليون)?)\s*(?:followers?|متابع)/i);
    if (followersMatch) {
      data.followers = followersMatch[1].trim();
    }
    
    // البحث عن الإعجابات
    const likesMatch = pageText.match(/(\d[\d,\.]*\s*(?:K|M|ألف|مليون)?)\s*(?:likes?|إعجاب)/i);
    if (likesMatch) {
      data.likes = likesMatch[1].trim();
    }
    
    // البحث في العناصر أيضاً
    const statsEls = document.querySelectorAll('[role="main"] a[href*="followers"], [role="main"] span, a[href*="/followers"]');
    statsEls.forEach(el => {
      const text = el.textContent?.toLowerCase() || '';
      if ((text.includes('follower') || text.includes('متابع')) && !data.followers) {
        data.followers = el.textContent?.trim();
      } else if ((text.includes('like') || text.includes('إعجاب')) && !data.likes) {
        data.likes = el.textContent?.trim();
      }
    });
    
    // التوثيق
    data.isVerified = !!document.querySelector('[aria-label*="Verified"], [aria-label*="موثق"], svg[aria-label*="verified"]');
    
    // معلومات الاتصال من قسم About
    const aboutSection = document.querySelector('[role="main"]');
    if (aboutSection) {
      const aboutText = aboutSection.innerText || '';
      
      // الهاتف - أنماط متعددة
      const phonePatterns = [
        /(?:\+?966|0)[\s-]?5[\d\s-]{8,}/,
        /(?:\+?971|0)[\s-]?5[\d\s-]{8,}/,
        /(?:\+?20|0)[\s-]?1[\d\s-]{9,}/,
        /\d{3}[\s-]?\d{3}[\s-]?\d{4}/,
      ];
      for (const pattern of phonePatterns) {
        const match = aboutText.match(pattern);
        if (match) {
          data.phone = match[0].replace(/[\s-]/g, '');
          break;
        }
      }
      
      // البريد
      const emailMatch = aboutText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        data.email = emailMatch[0];
      }
      
      // الموقع
      const websiteLinks = aboutSection.querySelectorAll('a[href]');
      websiteLinks.forEach(link => {
        const href = link.href;
        if (href && !href.includes('facebook.com') && !href.includes('fb.com') && 
            !href.includes('instagram.com') && !href.includes('twitter.com') &&
            (href.includes('http://') || href.includes('https://')) &&
            !data.website) {
          data.website = href;
        }
      });
      
      // ساعات العمل
      const hoursMatch = aboutText.match(/(?:ساعات العمل|working hours|open)[:\s]*([^\n]+)/i);
      if (hoursMatch) {
        data.workingHours = hoursMatch[1].trim();
      }
      
      // وقت الاستجابة
      const responseMatch = aboutText.match(/(?:typically responds|يرد عادة)[:\s]*([^\n]+)/i);
      if (responseMatch) {
        data.responseTime = responseMatch[1].trim();
      }
      
      // العنوان
      const addressMatch = aboutText.match(/(?:العنوان|address|located at)[:\s]*([^\n]+)/i);
      if (addressMatch) {
        data.address = addressMatch[1].trim();
      }
    }
    
    // الوصف
    const aboutEl = document.querySelector('[data-ad-preview="message"], .x1heor9g, [role="main"] span[dir="auto"]');
    data.about = aboutEl?.textContent?.trim()?.substring(0, 300);
    
    // آخر منشور
    const postTimeEls = document.querySelectorAll('[role="article"] a[href*="/posts/"] span, [role="feed"] time, abbr[data-utime]');
    if (postTimeEls.length > 0) {
      data.lastPostDate = postTimeEls[0].textContent?.trim() || postTimeEls[0].getAttribute('title');
    }
    
    // عدد المنشورات المرئية
    const postEls = document.querySelectorAll('[role="article"], [data-pagelet*="FeedUnit"]');
    data.recentPostsCount = postEls.length;
    
  } catch (e) {
    console.error('[Leedz Facebook] Scrape error:', e);
  }
  
  return data;
}

function scrapeLinkedInProfile() {
  const data = {
    companyName: null,
    tagline: null,
    industry: null,
    followers: null,
    employees: null,
    website: null,
    about: null,
  };
  
  try {
    const nameEl = document.querySelector('h1.org-top-card-summary__title');
    data.companyName = nameEl?.textContent?.trim();
    
    const taglineEl = document.querySelector('.org-top-card-summary__tagline');
    data.tagline = taglineEl?.textContent?.trim();
    
    const followersEl = document.querySelector('.org-top-card-summary__follower-count');
    data.followers = followersEl?.textContent?.trim();
    
    const employeesEl = document.querySelector('a[href*="people"] span');
    data.employees = employeesEl?.textContent?.trim();
    
    const websiteEl = document.querySelector('.org-about-us-company-module__website a');
    data.website = websiteEl?.href;
    
    const aboutEl = document.querySelector('.org-about-us-organization-description__text');
    data.about = aboutEl?.textContent?.trim()?.substring(0, 300);
  } catch (e) {}
  
  return data;
}

function scrapeTikTokProfile() {
  const data = {
    username: null,
    displayName: null,
    bio: null,
    followers: null,
    following: null,
    likes: null,
    videos: null,
    isVerified: false,
    email: null,
    phone: null,
    externalUrl: null,
    lastVideoDate: null,
    recentVideosCount: 0,
  };
  
  try {
    // اسم المستخدم
    const usernameEl = document.querySelector('[data-e2e="user-subtitle"], h2[data-e2e="user-subtitle"]');
    data.username = usernameEl?.textContent?.trim();
    
    // الاسم المعروض
    const nameEl = document.querySelector('[data-e2e="user-title"], h1[data-e2e="user-title"]');
    data.displayName = nameEl?.textContent?.trim();
    
    // البايو
    const bioEl = document.querySelector('[data-e2e="user-bio"], h2[data-e2e="user-bio"]');
    const bioText = bioEl?.textContent?.trim() || '';
    data.bio = bioText;
    
    // استخراج البريد من البايو
    const emailMatch = bioText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) data.email = emailMatch[0];
    
    // استخراج الهاتف من البايو
    const phoneMatch = bioText.match(/(?:\+?966|0)[\s-]?5[\d\s-]{8,}/);
    if (phoneMatch) data.phone = phoneMatch[0].replace(/[\s-]/g, '');
    
    // الإحصائيات
    const statsEls = document.querySelectorAll('[data-e2e="following-count"], [data-e2e="followers-count"], [data-e2e="likes-count"]');
    statsEls.forEach(el => {
      const dataE2e = el.getAttribute('data-e2e');
      const value = el.textContent?.trim();
      
      if (dataE2e?.includes('following')) data.following = value;
      if (dataE2e?.includes('followers')) data.followers = value;
      if (dataE2e?.includes('likes')) data.likes = value;
    });
    
    // عدد الفيديوهات من النص
    const pageText = document.body?.innerText || '';
    const videosMatch = pageText.match(/(\d+)\s*(?:videos?|فيديو)/i);
    if (videosMatch) data.videos = videosMatch[1];
    
    // التوثيق
    data.isVerified = !!document.querySelector('[data-e2e="user-title"] svg, [class*="verified"]');
    
    // الرابط الخارجي
    const linkEl = document.querySelector('[data-e2e="user-link"] a, a[href*="linktr.ee"], a[href*="bio.link"]');
    data.externalUrl = linkEl?.href;
    
    // عدد الفيديوهات المرئية
    const videoEls = document.querySelectorAll('[data-e2e="user-post-item"], [class*="video-feed"] > div');
    data.recentVideosCount = videoEls.length;
    
  } catch (e) {
    console.error('[Leedz TikTok] Scrape error:', e);
  }
  
  return data;
}

function scrapeYouTubeProfile() {
  const data = {
    channelName: null,
    handle: null,
    subscribers: null,
    videos: null,
    isVerified: false,
    description: null,
  };
  
  try {
    const nameEl = document.querySelector('#channel-name yt-formatted-string');
    data.channelName = nameEl?.textContent?.trim();
    
    const handleEl = document.querySelector('#channel-handle');
    data.handle = handleEl?.textContent?.trim();
    
    const subsEl = document.querySelector('#subscriber-count');
    data.subscribers = subsEl?.textContent?.trim();
    
    const videosEl = document.querySelector('#videos-count');
    data.videos = videosEl?.textContent?.trim();
    
    data.isVerified = !!document.querySelector('ytd-badge-supported-renderer[badge-style="BADGE_STYLE_TYPE_VERIFIED"]');
    
    const descEl = document.querySelector('#description-container yt-formatted-string');
    data.description = descEl?.textContent?.trim()?.substring(0, 300);
  } catch (e) {}
  
  return data;
}

/**
 * البحث في السوشيال ميديا فقط
 */
async function searchSocialMediaOnly(query, socialLinks) {
  console.log('[Leedz] Social Media Only Search:', query);
  
  const result = {
    success: false,
    profiles: {},
  };
  
  try {
    await ensureExecutionWindow();
    
    for (const [platform, url] of Object.entries(socialLinks || {})) {
      if (!url) continue;
      
      try {
        const data = await scrapeSocialProfile(platform, url);
        if (data) {
          result.profiles[platform] = data;
        }
      } catch (e) {
        console.error(`[Leedz] ${platform} error:`, e);
      }
    }
    
    result.success = Object.keys(result.profiles).length > 0;
    return result;
    
  } catch (error) {
    console.error('[Leedz] Social media search error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * إنشاء ملخص شامل من نتائج البحث
 */
function generateDeepSearchSummary(data) {
  const summary = {
    hasGoogleMaps: !!data.googleMaps?.name,
    hasWebsite: !!(data.googleMaps?.website || data.googleSearch?.officialWebsite),
    socialPlatforms: Object.keys(data.socialProfiles || {}),
    totalFollowers: 0,
    isVerifiedAnywhere: false,
    contactInfo: {
      phone: data.googleMaps?.phone || data.basic?.phone,
      email: data.basic?.email,
      website: data.googleMaps?.website || data.googleSearch?.officialWebsite || data.basic?.website,
      address: data.googleMaps?.address || data.basic?.address,
    },
    rating: data.googleMaps?.rating,
    reviews: data.googleMaps?.reviews,
  };
  
  // حساب إجمالي المتابعين
  for (const profile of Object.values(data.socialProfiles || {})) {
    const followers = parseFollowerCount(profile.followers || profile.subscribers);
    if (followers) {
      summary.totalFollowers += followers;
    }
    if (profile.isVerified) {
      summary.isVerifiedAnywhere = true;
    }
  }
  
  return summary;
}

/**
 * تحويل عدد المتابعين من نص إلى رقم
 */
function parseFollowerCount(text) {
  if (!text) return 0;
  
  const cleaned = text.replace(/[,،\s]/g, '').trim();
  const match = cleaned.match(/([\d.]+)\s*([KMBكمب])?/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  
  switch (suffix) {
    case 'K': case 'ك': num *= 1000; break;
    case 'M': case 'م': num *= 1000000; break;
    case 'B': case 'ب': num *= 1000000000; break;
  }
  
  return Math.round(num);
}
