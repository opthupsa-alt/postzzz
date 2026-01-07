/**
 * Leedz Extension - Background Service Worker
 * Handles authentication, API communication, WebSocket, and side panel management
 */

const API_BASE = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001/extension';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'leedz_auth_token',
  USER: 'leedz_user',
  TENANT: 'leedz_tenant',
};

// WebSocket state
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
let heartbeatInterval = null;

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

  const response = await fetch(`${API_BASE}${endpoint}`, {
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
    // Dynamic import for socket.io-client (bundled version needed for extension)
    // For now, we'll use a simple WebSocket approach
    // In production, you'd bundle socket.io-client with the extension
    
    console.log('[Leedz] Connecting to WebSocket...');
    
    // Using native WebSocket with Socket.IO protocol simulation
    // Note: For full Socket.IO support, bundle socket.io-client with webpack/rollup
    const wsUrl = `ws://localhost:3001/socket.io/?EIO=4&transport=websocket&token=${token}`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('[Leedz] WebSocket connected');
      reconnectAttempts = 0;
      
      // Send Socket.IO handshake
      socket.send('40/extension,{"token":"' + token + '"}');
      
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
  }, 25000);
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
    // Connection acknowledgment
    console.log('[Leedz] WebSocket namespace connected');
    return;
  }
  
  if (data.startsWith('42')) {
    // Event message
    try {
      const jsonStr = data.substring(2);
      const [event, payload] = JSON.parse(jsonStr);
      handleServerEvent(event, payload);
    } catch (e) {
      console.error('[Leedz] Failed to parse WebSocket message:', e);
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
      console.log('[Leedz] Job dispatched:', payload);
      handleJobDispatch(payload);
      break;
      
    case 'job_cancel':
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

async function handleJobDispatch(payload) {
  const { jobPlan } = payload;
  
  console.log('[Leedz] Received job:', jobPlan.jobId, jobPlan.type);
  
  // Store job
  activeJobs.set(jobPlan.jobId, {
    plan: jobPlan,
    status: 'received',
    startedAt: Date.now(),
  });
  
  // Acknowledge job receipt
  sendToServer('job_ack', { jobId: jobPlan.jobId, accepted: true });
  
  // Notify side panel
  broadcastToSidePanel({ type: 'JOB_RECEIVED', payload: jobPlan });
  
  // Execute job (placeholder - actual execution depends on job type)
  executeJob(jobPlan);
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
  // Placeholder for job execution
  // This will be expanded with actual connectors (Google Maps, etc.)
  
  console.log('[Leedz] Executing job:', jobPlan.jobId);
  
  // Simulate progress
  for (let i = 0; i < jobPlan.steps.length; i++) {
    const step = jobPlan.steps[i];
    
    // Report progress
    sendToServer('progress', {
      jobId: jobPlan.jobId,
      stepId: step.id,
      progress: Math.round(((i + 1) / jobPlan.steps.length) * 100),
      message: `Executing step ${i + 1}: ${step.action}`,
    });
    
    // Simulate step execution
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Report completion
  sendToServer('job_complete', {
    jobId: jobPlan.jobId,
    status: 'SUCCESS',
    summary: {
      stepsCompleted: jobPlan.steps.length,
      stepsTotal: jobPlan.steps.length,
      evidenceCount: 0,
      duration: Date.now() - activeJobs.get(jobPlan.jobId)?.startedAt || 0,
    },
  });
  
  activeJobs.delete(jobPlan.jobId);
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

// Auto-connect WebSocket on startup if authenticated
(async () => {
  const { [STORAGE_KEYS.AUTH_TOKEN]: token } = await getStorageData([STORAGE_KEYS.AUTH_TOKEN]);
  if (token) {
    // Verify token first
    try {
      await apiRequest('/auth/me');
      connectWebSocket();
    } catch (e) {
      console.log('[Leedz] Token invalid, clearing storage');
      await clearStorageData();
    }
  }
})();

console.log('[Leedz Extension] Background service worker initialized');
