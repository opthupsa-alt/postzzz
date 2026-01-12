/**
 * Postzzz Extension - Runner State Management
 * Manages device registration, heartbeat, client binding, and publishing jobs
 */

// ==================== Storage Keys ====================
const RUNNER_STORAGE_KEYS = {
  DEVICE_ID: 'postzzz_device_id',
  SELECTED_CLIENT_ID: 'postzzz_selected_client_id',
  RUNNER_MODE: 'postzzz_runner_mode', // 'ASSIST' | 'AUTO' (future)
  PLATFORM_LOGIN_STATUS: 'postzzz_platform_login_status',
  CLAIMED_JOBS: 'postzzz_claimed_jobs',
};

// ==================== Runner State ====================
const runnerState = {
  deviceId: null,
  selectedClientId: null,
  mode: 'ASSIST', // Only ASSIST mode for now
  isHeartbeatActive: false,
  heartbeatInterval: null,
  jobPollInterval: null,
  claimedJobs: [],
  platformLoginStatus: {}, // { X: 'LOGGED_IN', INSTAGRAM: 'NEEDS_LOGIN', ... }
};

// ==================== Initialization ====================

async function initRunnerState() {
  const data = await getRunnerStorageData([
    RUNNER_STORAGE_KEYS.DEVICE_ID,
    RUNNER_STORAGE_KEYS.SELECTED_CLIENT_ID,
    RUNNER_STORAGE_KEYS.RUNNER_MODE,
    RUNNER_STORAGE_KEYS.PLATFORM_LOGIN_STATUS,
    RUNNER_STORAGE_KEYS.CLAIMED_JOBS,
  ]);
  
  runnerState.deviceId = data[RUNNER_STORAGE_KEYS.DEVICE_ID] || null;
  runnerState.selectedClientId = data[RUNNER_STORAGE_KEYS.SELECTED_CLIENT_ID] || null;
  runnerState.mode = data[RUNNER_STORAGE_KEYS.RUNNER_MODE] || 'ASSIST';
  runnerState.platformLoginStatus = data[RUNNER_STORAGE_KEYS.PLATFORM_LOGIN_STATUS] || {};
  runnerState.claimedJobs = data[RUNNER_STORAGE_KEYS.CLAIMED_JOBS] || [];
  
  console.log('[Postzzz Runner] State initialized:', {
    deviceId: runnerState.deviceId,
    selectedClientId: runnerState.selectedClientId,
    mode: runnerState.mode,
  });
  
  return runnerState;
}

// ==================== Storage Helpers ====================

function getRunnerStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function setRunnerStorageData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

// ==================== Device Registration ====================

async function registerDevice(apiUrl, token, deviceName) {
  try {
    const response = await fetch(`${apiUrl}/api/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: deviceName || `Chrome Extension - ${navigator.platform}`,
        capabilities: {
          assistMode: true,
          autoMode: false,
          platforms: ['X', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'THREADS'],
        },
        userAgent: navigator.userAgent,
        version: chrome.runtime.getManifest().version,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    const device = result.data;
    
    // Save device ID
    runnerState.deviceId = device.id;
    await setRunnerStorageData({
      [RUNNER_STORAGE_KEYS.DEVICE_ID]: device.id,
    });
    
    console.log('[Postzzz Runner] Device registered:', device.id);
    return device;
  } catch (error) {
    console.error('[Postzzz Runner] Device registration failed:', error);
    throw error;
  }
}

// ==================== Heartbeat ====================

async function sendHeartbeat(apiUrl, token) {
  if (!runnerState.deviceId) {
    console.log('[Postzzz Runner] No device ID, skipping heartbeat');
    return null;
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/devices/${runnerState.deviceId}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        clientId: runnerState.selectedClientId || undefined,
        capabilities: {
          assistMode: true,
          autoMode: false,
          platforms: ['X', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'THREADS'],
        },
        version: chrome.runtime.getManifest().version,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[Postzzz Runner] Heartbeat sent');
    return result.data;
  } catch (error) {
    console.error('[Postzzz Runner] Heartbeat failed:', error);
    return null;
  }
}

function startHeartbeat(apiUrl, token, intervalMs = 25000) {
  if (runnerState.isHeartbeatActive) return;
  
  runnerState.isHeartbeatActive = true;
  
  // Send immediately
  sendHeartbeat(apiUrl, token);
  
  // Then send periodically
  runnerState.heartbeatInterval = setInterval(() => {
    sendHeartbeat(apiUrl, token);
  }, intervalMs);
  
  console.log('[Postzzz Runner] Heartbeat started');
}

function stopHeartbeat() {
  if (runnerState.heartbeatInterval) {
    clearInterval(runnerState.heartbeatInterval);
    runnerState.heartbeatInterval = null;
  }
  runnerState.isHeartbeatActive = false;
  console.log('[Postzzz Runner] Heartbeat stopped');
}

// ==================== Client Binding ====================

async function setSelectedClient(clientId) {
  runnerState.selectedClientId = clientId || null;
  await setRunnerStorageData({
    [RUNNER_STORAGE_KEYS.SELECTED_CLIENT_ID]: clientId || null,
  });
  console.log('[Postzzz Runner] Client selected:', clientId);
}

async function getClients(apiUrl, token) {
  try {
    const response = await fetch(`${apiUrl}/api/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('[Postzzz Runner] Failed to fetch clients:', error);
    return [];
  }
}

// ==================== Platform Login Status ====================

async function updatePlatformLoginStatus(platform, status) {
  runnerState.platformLoginStatus[platform] = status;
  await setRunnerStorageData({
    [RUNNER_STORAGE_KEYS.PLATFORM_LOGIN_STATUS]: runnerState.platformLoginStatus,
  });
}

function getPlatformLoginStatus(platform) {
  return runnerState.platformLoginStatus[platform] || 'UNKNOWN';
}

// ==================== Export for use in background.js ====================

if (typeof globalThis !== 'undefined') {
  globalThis.PostzzzRunner = {
    state: runnerState,
    STORAGE_KEYS: RUNNER_STORAGE_KEYS,
    init: initRunnerState,
    registerDevice,
    sendHeartbeat,
    startHeartbeat,
    stopHeartbeat,
    setSelectedClient,
    getClients,
    updatePlatformLoginStatus,
    getPlatformLoginStatus,
  };
}
