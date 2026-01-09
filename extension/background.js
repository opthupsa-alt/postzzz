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
let showSearchWindow = true; // Set to true to show the search window

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
  
  // Create new window - VISIBLE by default so user can see the search
  const window = await chrome.windows.create({
    type: 'normal',
    focused: showSearchWindow,
    width: 1400,
    height: 900,
    left: 100,
    top: 100,
    state: showSearchWindow ? 'normal' : 'minimized',
  });
  
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

// Timing configuration for performance optimization
const TIMING = {
  PAGE_LOAD_TIMEOUT: 20000,     // Max wait for page load
  RESULTS_WAIT: 4000,           // Wait for results to render (reduced from 5000)
  DETAILS_WAIT: 2500,           // Wait for details to load (reduced from 3000)
  SCROLL_DELAY: 1000,           // Delay between scrolls
  RETRY_BASE_DELAY: 2000,       // Base delay for retries
};

// Retry configuration
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  DELAY_MULTIPLIER: 1.5,
};

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
async function searchGoogleMaps({ query, city, country, searchType = 'BULK', maxResults = 30, onProgress }) {
  console.log('[Leedz] ========== STARTING GOOGLE MAPS SEARCH ==========');
  console.log('[Leedz] Query:', query);
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
      // Step 1: Create tab in execution window
      if (onProgress) onProgress(15, 'جاري فتح خرائط جوجل...');
      tab = await createExecutionTab(searchUrl);
      console.log('[Leedz] Tab created:', tab.id);
      
      // Step 2: Wait for page to load with extended timeout
      if (onProgress) onProgress(25, 'جاري تحميل الصفحة...');
      await waitForTabLoad(tab.id, TIMING.PAGE_LOAD_TIMEOUT);
      console.log('[Leedz] Tab loaded');
      
      // Step 3: Wait for results using MutationObserver (more efficient)
      if (onProgress) onProgress(35, 'جاري انتظار ظهور النتائج...');
      const waitResult = await waitForResults(tab.id, 8000);
      console.log('[Leedz] Results wait result:', waitResult);
      
      // Additional wait for DOM stability
      await delay(TIMING.RESULTS_WAIT);
      
      // Step 4: Scroll to load more results (for BULK search)
      const targetResults = searchType === 'SINGLE' ? 10 : maxResults;
      if (searchType === 'BULK' && maxResults > 10) {
        if (onProgress) onProgress(45, 'جاري تحميل المزيد من النتائج...');
        await scrollForMoreResults(tab.id, targetResults);
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
            
            // Layer 2: Google Search for additional info (website, social links)
            if (!enrichedResult.website || bestMatch.matchScore >= 70) {
              if (onProgress) onProgress(80, 'جاري البحث عن معلومات إضافية...');
              
              try {
                const googleSearchResults = await searchGoogle({
                  query: enrichedResult.name || query,
                  city,
                  tabId: tab.id,
                });
                
                console.log('[Leedz] Google Search results:', googleSearchResults);
                
                // Merge with Google Search results
                enrichedResult = mergeSearchResults(enrichedResult, googleSearchResults);
                
              } catch (gsError) {
                console.error('[Leedz] Google Search failed:', gsError);
                // Continue without Google Search data
              }
            }
            
            return [enrichedResult];
          } catch (detailError) {
            console.error('[Leedz] Failed to get detailed info:', detailError);
            return [bestMatch];
          }
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
        
        // URL Blacklist
        const BLACKLIST = [
          'google.com', 'google.co', 'goo.gl', 'youtube.com', 'facebook.com',
          'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'tiktok.com',
          'snapchat.com', 'wikipedia.org', 'wikidata.org', 'yelp.com',
          'tripadvisor.com', 'foursquare.com', 'yellowpages', 'whitepages',
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
        
        // Extract from search results
        const searchResults = document.querySelectorAll('#search .g, #rso .g, .g[data-hveid]');
        console.log('[Leedz Google Extract] Found', searchResults.length, 'results');
        
        const candidates = [];
        
        searchResults.forEach((result, index) => {
          const linkEl = result.querySelector('a[href]');
          if (!linkEl) return;
          
          const href = linkEl.href;
          if (!href || href.startsWith('javascript:')) return;
          
          const titleEl = result.querySelector('h3');
          const title = titleEl?.textContent?.trim() || '';
          
          // Check for social media
          const socialPlatform = getSocialPlatform(href);
          if (socialPlatform && !extracted.socialLinks[socialPlatform]) {
            extracted.socialLinks[socialPlatform] = href;
            console.log('[Leedz Google Extract] Found social:', socialPlatform);
          }
          
          // Check for official website candidate
          if (!isBlacklisted(href) && !socialPlatform) {
            let score = 100 - (index * 10);
            
            const queryLower = query.toLowerCase();
            const titleLower = title.toLowerCase();
            const hrefLower = href.toLowerCase();
            
            if (titleLower.includes(queryLower)) score += 30;
            if (hrefLower.includes(queryLower.split(' ')[0])) score += 20;
            
            candidates.push({ url: href, title, score, position: index });
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
      query,
      city,
      country: country || defaultCountry,
      searchType: finalSearchType,
      maxResults: finalMaxResults,
      onProgress,
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
      const searchQuery = { name: query, query, city };
      validatedResults = filterResultsBySmartMatch(searchQuery, results, threshold);
      
      console.log('[Leedz] Smart match results:', validatedResults.length, 'of', results.length);
      
      if (validatedResults.length === 0) {
        // لم يتم العثور على تطابق دقيق
        console.log('[Leedz] No results met the match threshold');
        await onProgress(90, `لم يتم العثور على تطابق دقيق (الحد الأدنى: ${threshold}%)`);
        
        await markJobComplete(jobId, {
          status: 'SUCCESS',
          resultsCount: 0,
          savedCount: 0,
          searchType: finalSearchType,
          duration: Date.now() - startTime,
          message: `لم يتم العثور على نتيجة تطابق ${threshold}%+`,
          rawResultsCount: results.length,
        });
        
        broadcastToSidePanel({
          type: 'JOB_COMPLETED',
          jobId,
          results: [],
          savedCount: 0,
          message: `لم يتم العثور على تطابق دقيق (${results.length} نتيجة لم تحقق الحد الأدنى ${threshold}%)`,
        });
        
        return;
      }
      
      // Log best match details
      const bestMatch = validatedResults[0];
      console.log('[Leedz] Best match:', bestMatch.name, 'Score:', bestMatch.matchScore);
    }
    
    // Step 3b: Validate results
    if (validatedResults.length === 0) {
      console.log('[Leedz] No results found');
      await onProgress(90, 'لم يتم العثور على نتائج');
      
      await markJobComplete(jobId, {
        status: 'SUCCESS',
        resultsCount: 0,
        savedCount: 0,
        searchType: finalSearchType,
        duration: Date.now() - startTime,
        message: 'لم يتم العثور على نتائج مطابقة',
      });
      
      broadcastToSidePanel({
        type: 'JOB_COMPLETED',
        jobId,
        results: [],
        savedCount: 0,
        message: 'لم يتم العثور على نتائج',
      });
      
      return;
    }
    
    // Step 4: Save leads to database
    await onProgress(70, `تم العثور على ${validatedResults.length} نتيجة، جاري الحفظ...`);
    
    const leads = validatedResults.map(r => ({
      companyName: r.name,
      industry: finalSearchType === 'SINGLE' ? null : query,
      city: city || null,
      phone: r.phone || null,
      website: r.website || null,
      address: r.address || null,
      source: 'GOOGLE_MAPS_SEARCH',
      jobId: jobId,
      metadata: {
        rating: r.rating,
        reviews: r.reviews,
        type: r.type,
        sourceUrl: r.sourceUrl,
        matchScore: r.matchScore,
        searchQuery: query,
        searchCity: city,
      },
    }));
    
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
    
    // Step 5: Mark job complete
    await onProgress(95, 'جاري إنهاء العملية...');
    
    await markJobComplete(jobPlan.jobId, {
      status: 'SUCCESS',
      resultsCount: results.length,
      savedCount,
      searchType: searchType || 'BULK',
      duration: Date.now() - activeJobs.get(jobPlan.jobId)?.startedAt || 0,
    });
    
    console.log('[Leedz] Job completed successfully');
    
    broadcastToSidePanel({
      type: 'JOB_COMPLETED',
      jobId,
      results,
      savedCount,
      duration: Date.now() - startTime,
    });
    
    console.log('[Leedz] ============================================');
    console.log('[Leedz] JOB COMPLETED SUCCESSFULLY');
    console.log('[Leedz] Results found:', results.length);
    console.log('[Leedz] Results saved:', savedCount);
    console.log('[Leedz] Duration:', Math.round((Date.now() - startTime) / 1000), 'seconds');
    console.log('[Leedz] ============================================');
    
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
