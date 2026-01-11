/**
 * Leedz Extension - Settings Page Logic
 * منطق صفحة الإعدادات
 * 
 * @version 1.0.0
 * @lastUpdate 2026-01-08
 */

// ==================== Configuration ====================
const PLATFORMS = [
  { 
    id: 'instagram', 
    name: 'Instagram', 
    icon: '📷', 
    url: 'https://www.instagram.com/', 
    loginUrl: 'https://www.instagram.com/accounts/login/',
    color: '#E4405F'
  },
  { 
    id: 'twitter', 
    name: 'X (Twitter)', 
    icon: '𝕏', 
    url: 'https://x.com/', 
    loginUrl: 'https://x.com/login',
    color: '#000000'
  },
  { 
    id: 'facebook', 
    name: 'Facebook', 
    icon: '📘', 
    url: 'https://www.facebook.com/', 
    loginUrl: 'https://www.facebook.com/login/',
    color: '#1877F2'
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    icon: '💼', 
    url: 'https://www.linkedin.com/', 
    loginUrl: 'https://www.linkedin.com/login',
    color: '#0A66C2'
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    icon: '🎵', 
    url: 'https://www.tiktok.com/', 
    loginUrl: 'https://www.tiktok.com/login',
    color: '#000000'
  },
  { 
    id: 'snapchat', 
    name: 'Snapchat', 
    icon: '👻', 
    url: 'https://www.snapchat.com/', 
    loginUrl: 'https://accounts.snapchat.com/accounts/login',
    color: '#FFFC00'
  },
];

// Storage Keys
const STORAGE_KEYS = {
  PLATFORMS: 'leedz_social_platforms',
  SETTINGS: 'leedz_extension_settings',
  AUTH_TOKEN: 'leedz_auth_token',
  CONFIG: 'leedz_config',
};

// Default URLs للإنتاج (يمكن تجاوزها من config.js للتطوير المحلي)
const DEFAULT_API_URL = 'https://leedz-api.onrender.com';
const DEFAULT_WEB_URL = 'https://leedz.vercel.app';

// Get API URL from config or default
function getApiUrl() {
  // Try to get from LEEDZ_CONFIG if available
  if (typeof LEEDZ_CONFIG !== 'undefined' && LEEDZ_CONFIG.API_URL) {
    return LEEDZ_CONFIG.API_URL;
  }
  return DEFAULT_API_URL;
}

const API_URL = getApiUrl();

// Default Settings
const DEFAULT_SETTINGS = {
  enableGoogleMaps: true,
  enableGoogleSearch: true,
  enableSocialMedia: false,
  matchThreshold: 90,
  maxResults: 30,
  searchDelay: 3,
  showSearchWindow: false,
  debugMode: false,
};

// ==================== Storage Functions ====================

async function loadPlatformStates() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.PLATFORMS);
    return data[STORAGE_KEYS.PLATFORMS] || {};
  } catch (error) {
    console.error('Failed to load platform states:', error);
    return {};
  }
}

async function savePlatformStates(states) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.PLATFORMS]: states });
    return true;
  } catch (error) {
    console.error('Failed to save platform states:', error);
    return false;
  }
}

async function loadSettings() {
  try {
    // Try to load from local storage first
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    let settings = { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] || {}) };
    
    // Try to sync from backend
    const backendSettings = await fetchSettingsFromBackend();
    if (backendSettings) {
      settings = { ...settings, ...backendSettings };
      // Update local storage with backend settings
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings) {
  try {
    // Save to local storage
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    
    // Try to sync to backend
    await saveSettingsToBackend(settings);
    
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

async function getAuthToken() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
    return data[STORAGE_KEYS.AUTH_TOKEN] || null;
  } catch {
    return null;
  }
}

async function fetchSettingsFromBackend() {
  try {
    const token = await getAuthToken();
    if (!token) return null;
    
    const response = await fetch(`${API_URL}/extension-settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.settings || null;
  } catch (error) {
    console.error('Failed to fetch settings from backend:', error);
    return null;
  }
}

async function saveSettingsToBackend(settings) {
  try {
    const token = await getAuthToken();
    if (!token) return false;
    
    const response = await fetch(`${API_URL}/extension-settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to save settings to backend:', error);
    return false;
  }
}

// ==================== Platform Functions ====================

async function checkPlatformLogin(platform) {
  try {
    // Create a hidden tab to check login status
    const tab = await chrome.tabs.create({
      url: platform.url,
      active: false,
    });
    
    // Wait for tab to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check login status
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [platform.id],
      func: (platformId) => {
        // Each platform has different login indicators
        switch (platformId) {
          case 'instagram':
            return !!document.querySelector('[aria-label="Home"]') || 
                   !!document.querySelector('[aria-label="الصفحة الرئيسية"]') ||
                   !!document.querySelector('svg[aria-label="Home"]');
          case 'twitter':
            return !!document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') ||
                   !!document.querySelector('[data-testid="AppTabBar_Home_Link"]');
          case 'facebook':
            return !!document.querySelector('[aria-label="Your profile"]') ||
                   !!document.querySelector('[aria-label="ملفك الشخصي"]') ||
                   !!document.querySelector('[aria-label="Account"]');
          case 'linkedin':
            return !!document.querySelector('.global-nav__me') ||
                   !!document.querySelector('[data-control-name="identity_welcome_message"]');
          case 'tiktok':
            return !!document.querySelector('[data-e2e="profile-icon"]') ||
                   !!document.querySelector('[data-e2e="nav-profile"]');
          case 'snapchat':
            return !!document.querySelector('.logged-in-indicator') ||
                   document.body.innerHTML.includes('logout');
          default:
            return false;
        }
      },
    });
    
    // Close the tab
    await chrome.tabs.remove(tab.id);
    
    return results[0]?.result || false;
  } catch (error) {
    console.error(`Failed to check ${platform.id}:`, error);
    return false;
  }
}

async function openLoginPage(platform) {
  try {
    await chrome.tabs.create({
      url: platform.loginUrl,
      active: true,
    });
    return true;
  } catch (error) {
    console.error(`Failed to open login page for ${platform.id}:`, error);
    return false;
  }
}

// ==================== UI Functions ====================

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  toast.className = `toast ${type}`;
  toastMessage.textContent = message;
  
  // Show toast
  toast.classList.remove('hidden');
  
  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

async function renderPlatforms() {
  const container = document.getElementById('platformsList');
  const states = await loadPlatformStates();
  
  container.innerHTML = '';
  
  for (const platform of PLATFORMS) {
    const state = states[platform.id] || {};
    const isConnected = state.connected || false;
    const username = state.username || '';
    const lastChecked = state.lastChecked ? new Date(state.lastChecked).toLocaleDateString('ar-SA') : '';
    
    const item = document.createElement('div');
    item.className = `platform-item ${isConnected ? 'connected' : ''}`;
    item.innerHTML = `
      <div class="platform-info">
        <span class="platform-icon">${platform.icon}</span>
        <div>
          <span class="platform-name">${platform.name}</span>
          ${lastChecked ? `<small style="display:block;color:#9ca3af;font-size:11px;">آخر فحص: ${lastChecked}</small>` : ''}
        </div>
      </div>
      <div class="platform-status">
        <span class="status-indicator ${isConnected ? 'online' : 'offline'}">
          ${isConnected ? `● متصل${username ? ': @' + username : ''}` : '○ غير متصل'}
        </span>
        <button class="btn ${isConnected ? 'btn-disconnect' : 'btn-connect'}" data-platform="${platform.id}">
          ${isConnected ? 'قطع الاتصال' : 'تسجيل الدخول'}
        </button>
      </div>
    `;
    
    container.appendChild(item);
  }
  
  // Add event listeners
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', handlePlatformAction);
  });
}

async function handlePlatformAction(event) {
  const platformId = event.target.dataset.platform;
  const platform = PLATFORMS.find(p => p.id === platformId);
  const states = await loadPlatformStates();
  
  if (states[platformId]?.connected) {
    // Disconnect
    delete states[platformId];
    await savePlatformStates(states);
    showToast(`تم قطع الاتصال بـ ${platform.name}`, 'info');
  } else {
    // Open login page
    showToast(`جاري فتح صفحة تسجيل الدخول لـ ${platform.name}...`, 'info');
    await openLoginPage(platform);
    
    // Show instruction
    showToast('بعد تسجيل الدخول، اضغط على "التحقق من جميع الحسابات"', 'info');
  }
  
  renderPlatforms();
}

async function checkAllPlatforms() {
  const checkBtn = document.getElementById('checkAllBtn');
  checkBtn.disabled = true;
  checkBtn.textContent = '⏳ جاري التحقق...';
  
  const states = await loadPlatformStates();
  let connectedCount = 0;
  
  for (const platform of PLATFORMS) {
    try {
      // Update UI to show checking
      const item = document.querySelector(`[data-platform="${platform.id}"]`)?.closest('.platform-item');
      if (item) {
        const statusEl = item.querySelector('.status-indicator');
        statusEl.className = 'status-indicator checking';
        statusEl.textContent = '⏳ جاري التحقق...';
      }
      
      const isLoggedIn = await checkPlatformLogin(platform);
      
      if (isLoggedIn) {
        states[platform.id] = {
          connected: true,
          lastChecked: new Date().toISOString(),
        };
        connectedCount++;
      } else {
        if (states[platform.id]) {
          states[platform.id].connected = false;
          states[platform.id].lastChecked = new Date().toISOString();
        }
      }
    } catch (error) {
      console.error(`Error checking ${platform.id}:`, error);
    }
  }
  
  await savePlatformStates(states);
  await renderPlatforms();
  
  checkBtn.disabled = false;
  checkBtn.textContent = '🔄 التحقق من جميع الحسابات';
  
  showToast(`تم التحقق: ${connectedCount} حساب متصل من ${PLATFORMS.length}`, 'success');
}

async function loadSettingsUI() {
  const settings = await loadSettings();
  
  // Checkboxes
  document.getElementById('enableGoogleMaps').checked = settings.enableGoogleMaps;
  document.getElementById('enableGoogleSearch').checked = settings.enableGoogleSearch;
  document.getElementById('enableSocialMedia').checked = settings.enableSocialMedia;
  document.getElementById('showSearchWindow').checked = settings.showSearchWindow;
  document.getElementById('debugMode').checked = settings.debugMode;
  
  // Selects/Inputs
  document.getElementById('maxResults').value = settings.maxResults;
  document.getElementById('searchDelay').value = settings.searchDelay;
  
  // Match Threshold
  const matchThresholdEl = document.getElementById('matchThreshold');
  const matchThresholdValue = document.getElementById('matchThresholdValue');
  if (matchThresholdEl) {
    matchThresholdEl.value = settings.matchThreshold || 90;
    if (matchThresholdValue) {
      matchThresholdValue.textContent = `${settings.matchThreshold || 90}%`;
    }
  }
}

async function saveAllSettings() {
  const matchThresholdEl = document.getElementById('matchThreshold');
  
  const settings = {
    enableGoogleMaps: document.getElementById('enableGoogleMaps').checked,
    enableGoogleSearch: document.getElementById('enableGoogleSearch').checked,
    enableSocialMedia: document.getElementById('enableSocialMedia').checked,
    showSearchWindow: document.getElementById('showSearchWindow').checked,
    debugMode: document.getElementById('debugMode').checked,
    maxResults: parseInt(document.getElementById('maxResults').value),
    searchDelay: parseInt(document.getElementById('searchDelay').value),
    matchThreshold: matchThresholdEl ? parseInt(matchThresholdEl.value) : 90,
  };
  
  const success = await saveSettings(settings);
  
  if (success) {
    showToast('تم حفظ الإعدادات بنجاح', 'success');
    
    // Notify background script
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
  } else {
    showToast('فشل حفظ الإعدادات', 'error');
  }
}

async function resetSettings() {
  if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات؟')) {
    await saveSettings(DEFAULT_SETTINGS);
    await loadSettingsUI();
    showToast('تم إعادة تعيين الإعدادات', 'info');
  }
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', async () => {
  // Load platforms
  await renderPlatforms();
  
  // Load settings
  await loadSettingsUI();
  
  // Event listeners
  document.getElementById('checkAllBtn').addEventListener('click', checkAllPlatforms);
  document.getElementById('saveBtn').addEventListener('click', saveAllSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
  
  // Match threshold slider
  const matchThresholdEl = document.getElementById('matchThreshold');
  const matchThresholdValue = document.getElementById('matchThresholdValue');
  if (matchThresholdEl && matchThresholdValue) {
    matchThresholdEl.addEventListener('input', () => {
      matchThresholdValue.textContent = `${matchThresholdEl.value}%`;
    });
  }
});

console.log('[Leedz Settings] Page loaded');
