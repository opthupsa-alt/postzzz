/**
 * Leedz Extension - Background Service Worker
 * Handles authentication, API communication, and side panel management
 */

const API_BASE = 'http://localhost:3001';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'leedz_auth_token',
  USER: 'leedz_user',
  TENANT: 'leedz_tenant',
};

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

// ==================== Side Panel Setup ====================

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

console.log('[Leedz Extension] Background service worker initialized');
