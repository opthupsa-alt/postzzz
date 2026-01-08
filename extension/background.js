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

// Default config (will be updated from API)
let platformConfig = {
  platformUrl: 'http://localhost:3002',
  apiUrl: 'http://localhost:3001',
  extensionAutoLogin: true,
  extensionDebugMode: false,
  searchMethod: 'GOOGLE_MAPS_REAL',
  searchRateLimit: 10,
  crawlRateLimit: 20,
};

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

        case 'TEST_SEARCH':
          // Direct test search from side panel
          console.log('[Leedz] Test search:', message.query, message.city);
          try {
            const testJobPlan = {
              jobId: 'test_' + Date.now(),
              type: 'GOOGLE_MAPS_SEARCH',
              context: {
                query: message.query,
                city: message.city,
                country: message.country || 'السعودية',
                searchType: message.searchType || 'BULK',
              },
            };
            await executeGoogleMapsSearch(testJobPlan);
            return { success: true };
          } catch (error) {
            console.error('[Leedz] Test search error:', error);
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
  try {
    // Step 1: Create tab in execution window
    if (onProgress) onProgress(15, 'جاري فتح خرائط جوجل...');
    tab = await createExecutionTab(searchUrl);
    console.log('[Leedz] Tab created:', tab.id);
    
    // Step 2: Wait for page to load with extended timeout
    if (onProgress) onProgress(25, 'جاري تحميل الصفحة...');
    await waitForTabLoad(tab.id, 20000);
    console.log('[Leedz] Tab loaded');
    
    // Step 3: Wait for initial results to render (increased wait time)
    if (onProgress) onProgress(35, 'جاري انتظار ظهور النتائج...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for results to load
    
    // Step 4: Scroll to load more results (for BULK search)
    const targetResults = searchType === 'SINGLE' ? 10 : maxResults;
    if (searchType === 'BULK' && maxResults > 10) {
      if (onProgress) onProgress(45, 'جاري تحميل المزيد من النتائج...');
      await scrollForMoreResults(tab.id, targetResults);
    }
    
    // Step 5: Extract results
    if (onProgress) onProgress(60, 'جاري استخراج البيانات...');
    const results = await extractGoogleMapsResults(tab.id, targetResults, searchType === 'SINGLE' ? query : null);
    
    console.log('[Leedz] ========== EXTRACTION COMPLETE ==========');
    console.log('[Leedz] Total results extracted:', results.length);
    
    // For SINGLE search, click on the best match and get detailed info
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
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for details to load
          
          // Extract detailed info
          const details = await extractPlaceDetails(tab.id);
          console.log('[Leedz] Detailed info extracted:', details);
          
          // Merge details with best match
          return [{
            ...bestMatch,
            name: details.name || bestMatch.name,
            phone: details.phone || bestMatch.phone,
            website: details.website || bestMatch.website,
            address: details.address || bestMatch.address,
            rating: details.rating || bestMatch.rating,
            reviews: details.reviews || bestMatch.reviews,
            type: details.category || bestMatch.type,
            hours: details.hours,
            detailsExtracted: true,
          }];
        } catch (detailError) {
          console.error('[Leedz] Failed to get detailed info:', detailError);
          return [bestMatch];
        }
      }
      
      return [bestMatch];
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
    }
  }
}

// Extract detailed info from a single place page in Google Maps
async function extractPlaceDetails(tabId) {
  console.log('[Leedz] Extracting detailed place info from tab:', tabId);
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        console.log('[Leedz Details] ========== EXTRACTING PLACE DETAILS ==========');
        
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
        
        // Name - from h1 or title
        const nameEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge, [role="main"] h1');
        details.name = nameEl?.textContent?.trim() || null;
        console.log('[Leedz Details] Name:', details.name);
        
        // Rating
        const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"], span.ceNzKf, div.fontDisplayLarge');
        if (ratingEl) {
          const ratingText = ratingEl.textContent?.trim();
          if (ratingText && /^\d/.test(ratingText)) {
            details.rating = ratingText.replace(',', '.');
          }
        }
        console.log('[Leedz Details] Rating:', details.rating);
        
        // Reviews count
        const reviewsEl = document.querySelector('span[aria-label*="review"], button[aria-label*="review"]');
        if (reviewsEl) {
          const reviewsText = reviewsEl.getAttribute('aria-label') || reviewsEl.textContent || '';
          const match = reviewsText.match(/([\d,\.]+)/);
          if (match) details.reviews = match[1].replace(/,/g, '');
        }
        console.log('[Leedz Details] Reviews:', details.reviews);
        
        // Category/Type
        const categoryEl = document.querySelector('button[jsaction*="category"], span.DkEaL');
        details.category = categoryEl?.textContent?.trim() || null;
        console.log('[Leedz Details] Category:', details.category);
        
        // Look for info buttons/links with data
        const infoButtons = document.querySelectorAll('button[data-item-id], a[data-item-id]');
        infoButtons.forEach(btn => {
          const itemId = btn.getAttribute('data-item-id');
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const text = btn.textContent?.trim() || '';
          
          // Phone
          if (itemId?.includes('phone') || ariaLabel.includes('Phone') || ariaLabel.includes('هاتف')) {
            const phoneMatch = (ariaLabel + ' ' + text).match(/[\d\s\-\+\(\)]{7,}/);
            if (phoneMatch) details.phone = phoneMatch[0].trim();
          }
          
          // Website
          if (itemId?.includes('authority') || ariaLabel.includes('Website') || ariaLabel.includes('موقع')) {
            const href = btn.getAttribute('href') || btn.querySelector('a')?.href;
            if (href && !href.includes('google.com')) {
              details.website = href;
            }
          }
          
          // Address
          if (itemId?.includes('address') || ariaLabel.includes('Address') || ariaLabel.includes('عنوان')) {
            details.address = ariaLabel.replace(/^Address:\s*/i, '').trim() || text;
          }
        });
        
        // Alternative: Look for specific divs with icons
        const allDivs = document.querySelectorAll('div[role="button"], button');
        allDivs.forEach(div => {
          const text = div.textContent?.trim() || '';
          const ariaLabel = div.getAttribute('aria-label') || '';
          
          // Phone pattern
          if (!details.phone) {
            const phoneMatch = text.match(/^[\d\s\-\+\(\)]{7,20}$/);
            if (phoneMatch) details.phone = phoneMatch[0];
          }
          
          // Website pattern
          if (!details.website && text.match(/^(www\.|http|[a-z]+\.[a-z]{2,})/i)) {
            if (!text.includes('google.com')) {
              details.website = text.startsWith('http') ? text : 'https://' + text;
            }
          }
        });
        
        // Look for address in the side panel
        if (!details.address) {
          const addressDivs = document.querySelectorAll('.rogA2c, .Io6YTe');
          addressDivs.forEach(div => {
            const text = div.textContent?.trim();
            if (text && text.length > 10 && text.length < 200) {
              if (!details.address || text.length > details.address.length) {
                details.address = text;
              }
            }
          });
        }
        
        // Extract from aria-labels as fallback
        const allButtons = document.querySelectorAll('[aria-label]');
        allButtons.forEach(el => {
          const label = el.getAttribute('aria-label') || '';
          
          if (!details.phone && (label.includes('Phone:') || label.includes('هاتف:'))) {
            const match = label.match(/[\d\s\-\+\(\)]{7,}/);
            if (match) details.phone = match[0].trim();
          }
          
          if (!details.address && (label.includes('Address:') || label.includes('عنوان:'))) {
            details.address = label.replace(/^(Address|عنوان):\s*/i, '').trim();
          }
        });
        
        // Hours
        const hoursEl = document.querySelector('[aria-label*="hour"], [aria-label*="ساعات"]');
        if (hoursEl) {
          details.hours = hoursEl.getAttribute('aria-label')?.replace(/^.*?:\s*/, '') || null;
        }
        
        console.log('[Leedz Details] Phone:', details.phone);
        console.log('[Leedz Details] Website:', details.website);
        console.log('[Leedz Details] Address:', details.address);
        console.log('[Leedz Details] ========== EXTRACTION COMPLETE ==========');
        
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
        
        const items = [];
        const seenNames = new Set();
        
        // Strategy 1: Look for place links directly (most reliable)
        const placeLinks = document.querySelectorAll('a[href*="/maps/place/"]');
        console.log('[Leedz Extract] Found', placeLinks.length, 'place links');
        
        if (placeLinks.length > 0) {
          placeLinks.forEach((link, index) => {
            if (items.length >= maxResults) return;
            
            // Get the parent container that has all the info
            let container = link.closest('div[jsaction]') || link.parentElement?.parentElement?.parentElement;
            if (!container) container = link;
            
            // Extract name from aria-label or link text
            let name = link.getAttribute('aria-label') || '';
            if (!name) {
              // Try to find name in the container
              const nameEl = container.querySelector('.fontHeadlineSmall, .qBF1Pd, [class*="fontHeadline"]');
              name = nameEl?.textContent?.trim() || '';
            }
            
            // If still no name, try the link's text content
            if (!name) {
              name = link.textContent?.trim() || '';
            }
            
            // Clean up name - remove extra info
            if (name.includes('·')) {
              name = name.split('·')[0].trim();
            }
            
            if (!name || name.length < 2) return;
            
            // Skip duplicates
            const nameKey = name.toLowerCase().trim();
            if (seenNames.has(nameKey)) return;
            seenNames.add(nameKey);
            
            // Extract other info from container
            const containerText = container.textContent || '';
            
            // Rating
            let rating = null;
            const ratingMatch = containerText.match(/(\d[.,]\d)\s*(?:★|\()/);
            if (ratingMatch) rating = ratingMatch[1];
            
            // Reviews
            let reviews = null;
            const reviewsMatch = containerText.match(/\((\d[\d,\.]*)\)/);
            if (reviewsMatch) reviews = reviewsMatch[1];
            
            // Address - look for text after the rating/reviews
            let address = '';
            const addressEl = container.querySelector('.W4Efsd');
            if (addressEl) {
              address = addressEl.textContent?.trim() || '';
            }
            
            // Calculate match score for SINGLE search
            let matchScore = 100;
            if (searchName) {
              const normalizedName = name.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '');
              const normalizedSearch = searchName.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '');
              
              if (normalizedName === normalizedSearch) {
                matchScore = 100;
              } else if (normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)) {
                matchScore = 80;
              } else {
                const nameWords = normalizedName.split(/\s+/);
                const searchWords = normalizedSearch.split(/\s+/);
                const commonWords = nameWords.filter(w => 
                  searchWords.some(sw => sw.includes(w) || w.includes(sw))
                );
                matchScore = Math.max(30, (commonWords.length / Math.max(nameWords.length, searchWords.length)) * 100);
              }
            }
            
            console.log('[Leedz Extract] Found:', name, 'Score:', matchScore);
            
            items.push({
              name,
              rating,
              reviews,
              type: null,
              address,
              phone: null,
              website: null,
              source: 'google_maps',
              sourceUrl: link.href || window.location.href,
              matchScore,
            });
          });
        }
        
        // Strategy 2: If no place links, try feed items
        if (items.length === 0) {
          console.log('[Leedz Extract] Trying feed items strategy...');
          const feedItems = document.querySelectorAll('div[role="feed"] > div');
          console.log('[Leedz Extract] Found', feedItems.length, 'feed items');
          
          feedItems.forEach((item, index) => {
            if (items.length >= maxResults) return;
            
            // Look for any text that looks like a business name
            const allText = item.textContent || '';
            const firstLine = allText.split('\n')[0]?.trim();
            
            if (firstLine && firstLine.length > 2 && firstLine.length < 100) {
              const nameKey = firstLine.toLowerCase();
              if (!seenNames.has(nameKey)) {
                seenNames.add(nameKey);
                console.log('[Leedz Extract] Found from feed:', firstLine);
                items.push({
                  name: firstLine,
                  rating: null,
                  reviews: null,
                  type: null,
                  address: null,
                  phone: null,
                  website: null,
                  source: 'google_maps',
                  sourceUrl: window.location.href,
                  matchScore: 50,
                });
              }
            }
          });
        }
        
        // Strategy 3: Last resort - look for any business-like text
        if (items.length === 0) {
          console.log('[Leedz Extract] Trying last resort strategy...');
          // Check if this is a single place view
          const placeTitle = document.querySelector('h1.DUwDvf, h1[class*="header"]');
          if (placeTitle) {
            const name = placeTitle.textContent?.trim();
            if (name) {
              console.log('[Leedz Extract] Found single place:', name);
              items.push({
                name,
                rating: null,
                reviews: null,
                type: null,
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
        
        // Sort by match score for SINGLE search
        if (searchName) {
          items.sort((a, b) => b.matchScore - a.matchScore);
        }
        
        console.log('[Leedz Extract] ========== EXTRACTION COMPLETE ==========');
        console.log('[Leedz Extract] Total items extracted:', items.length);
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
    
    // Step 3: Validate results
    if (results.length === 0) {
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
    await onProgress(70, `تم العثور على ${results.length} نتيجة، جاري الحفظ...`);
    
    const leads = results.map(r => ({
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
