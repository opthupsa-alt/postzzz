/**
 * Postzzz Extension - Side Panel Script
 * Publishing-focused UI for social media automation
 */

// ==================== Configuration ====================
const CONFIG = typeof LEEDZ_CONFIG !== 'undefined' ? LEEDZ_CONFIG : {
  API_URL: 'https://leedz-api.onrender.com',
  WEB_URL: 'https://leedz.vercel.app'
};

// ==================== DOM Elements ====================

const loadingContainer = document.getElementById('loadingContainer');
const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const loadingStatus = document.getElementById('loadingStatus');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const connectionStatus = document.getElementById('connectionStatus');
const logoutBtn = document.getElementById('logoutBtn');
const autoLoginSection = document.getElementById('autoLoginSection');
const autoLoginBtn = document.getElementById('autoLoginBtn');
const autoLoginBtnText = document.getElementById('autoLoginBtnText');
const openPlatformBtn = document.getElementById('openPlatformBtn');

// ==================== State ====================

let isLoading = false;
let platformConfig = null;
let currentUser = null;

// ==================== Helpers ====================

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}

function showError(message) {
  if (loginError) {
    loginError.textContent = message;
    loginError.classList.add('show');
  }
}

function hideError() {
  if (loginError) {
    loginError.classList.remove('show');
  }
}

function setLoading(loading) {
  isLoading = loading;
  if (loginBtn) loginBtn.disabled = loading;
  if (loginBtnText) {
    loginBtnText.innerHTML = loading 
      ? '<span class="spinner"></span>' 
      : 'تسجيل الدخول';
  }
}

function showLoadingScreen(message) {
  if (loadingContainer) loadingContainer.classList.remove('hide');
  if (loginContainer) loginContainer.classList.add('hide');
  if (appContainer) appContainer.classList.remove('show');
  if (message && loadingStatus) loadingStatus.textContent = message;
}

function hideLoadingScreen() {
  if (loadingContainer) loadingContainer.classList.add('hide');
}

function showLoginScreen() {
  hideLoadingScreen();
  if (loginContainer) loginContainer.classList.remove('hide');
  if (appContainer) appContainer.classList.remove('show');
}

function showApp(user) {
  hideLoadingScreen();
  if (loginContainer) loginContainer.classList.add('hide');
  if (appContainer) appContainer.classList.add('show');
  
  currentUser = user;
  
  if (user) {
    if (userName) userName.textContent = user.name || user.email || 'المستخدم';
    if (userAvatar) userAvatar.textContent = (user.name || user.email || 'م').charAt(0).toUpperCase();
  }
  
  // Connect WebSocket
  sendMessage({ type: 'CONNECT_WEBSOCKET' });
  updateConnectionStatus();
  
  // Load runner UI
  loadRunnerUI();
}

async function updateConnectionStatus() {
  // Check auth state instead of WS status (WebSocket removed)
  const authState = await sendMessage({ type: 'GET_AUTH_STATE' });
  if (connectionStatus) {
    if (authState?.isAuthenticated) {
      connectionStatus.textContent = 'متصل';
      connectionStatus.className = 'status-badge connected';
    } else {
      connectionStatus.textContent = 'غير متصل';
      connectionStatus.className = 'status-badge disconnected';
    }
  }
}

// ==================== Runner UI ====================

let runnerUILoaded = false;

async function loadRunnerUI() {
  // Prevent duplicate loading
  if (runnerUILoaded) {
    console.log('[Postzzz] Runner UI already loaded');
    return;
  }
  
  const runnerContainer = document.getElementById('runnerContainer');
  if (!runnerContainer) return;
  
  try {
    // Load runner UI HTML
    const response = await fetch(chrome.runtime.getURL('runner/runner-ui.html'));
    const html = await response.text();
    runnerContainer.innerHTML = html;
    
    // Check if script already exists
    if (document.querySelector('script[src*="runner-ui.js"]')) {
      console.log('[Postzzz] Runner UI script already exists');
      if (window.PostzzzRunnerUI) {
        window.PostzzzRunnerUI.init();
      }
      runnerUILoaded = true;
      return;
    }
    
    // Load runner UI script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('runner/runner-ui.js');
    script.onload = () => {
      // Initialize runner UI after script loads
      if (window.PostzzzRunnerUI) {
        window.PostzzzRunnerUI.init();
      }
      runnerUILoaded = true;
    };
    document.body.appendChild(script);
  } catch (error) {
    console.error('[Postzzz] Failed to load runner UI:', error);
    runnerContainer.innerHTML = '<p class="error">فشل تحميل واجهة النشر</p>';
  }
}

// ==================== Auth ====================

async function handleLogin(e) {
  e.preventDefault();
  if (isLoading) return;

  hideError();
  setLoading(true);

  try {
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      showError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      setLoading(false);
      return;
    }

    const result = await sendMessage({ type: 'LOGIN', email, password });
    
    if (result?.error) {
      showError(result.error);
      setLoading(false);
      return;
    }

    showApp(result.user);
  } catch (error) {
    showError(error.message || 'فشل تسجيل الدخول');
  } finally {
    setLoading(false);
  }
}

async function handleLogout() {
  await sendMessage({ type: 'LOGOUT' });
  showLoginScreen();
}

async function handleAutoLogin() {
  if (autoLoginBtn) autoLoginBtn.disabled = true;
  if (autoLoginBtnText) autoLoginBtnText.innerHTML = '<span class="spinner"></span>';

  try {
    const result = await sendMessage({ type: 'CHECK_PLATFORM_LOGIN' });
    
    if (result?.success) {
      showApp(result.user);
    } else {
      if (result?.platformUrl) {
        window.open(result.platformUrl, '_blank');
      }
      showError('يرجى تسجيل الدخول في المنصة أولاً');
    }
  } catch (error) {
    showError('فشل تسجيل الدخول التلقائي');
  } finally {
    if (autoLoginBtn) autoLoginBtn.disabled = false;
    if (autoLoginBtnText) autoLoginBtnText.textContent = 'تسجيل دخول تلقائي';
  }
}

async function handleOpenPlatform() {
  await sendMessage({ type: 'OPEN_PLATFORM' });
}

// ==================== Message Listener ====================

chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'WS_CONNECTED':
      updateConnectionStatus();
      break;
      
    case 'WS_DISCONNECTED':
      updateConnectionStatus();
      break;
      
    case 'NEW_JOB':
      // Notify runner UI
      if (window.PostzzzRunnerUI) {
        window.PostzzzRunnerUI.onNewJob(message.job);
      }
      break;
      
    case 'JOB_CANCELLED':
      if (window.PostzzzRunnerUI) {
        window.PostzzzRunnerUI.onJobCancelled(message.jobId);
      }
      break;
      
    case 'PENDING_JOBS':
      if (window.PostzzzRunnerUI) {
        window.PostzzzRunnerUI.onPendingJobs(message.jobs);
      }
      break;
  }
});

// ==================== Initialize ====================

async function init() {
  showLoadingScreen('جاري التحميل...');

  // Get platform config
  platformConfig = await sendMessage({ type: 'GET_PLATFORM_CONFIG' });

  // Check auth state
  const authState = await sendMessage({ type: 'GET_AUTH_STATE' });
  
  if (authState?.isAuthenticated) {
    // Verify token
    const { valid } = await sendMessage({ type: 'VERIFY_TOKEN' });
    
    if (valid) {
      showApp(authState.user);
      return;
    }
  }

  // Try auto-login
  showLoadingScreen('جاري تسجيل الدخول التلقائي...');
  const autoLoginResult = await sendMessage({ type: 'CHECK_PLATFORM_LOGIN' });
  
  if (autoLoginResult?.success) {
    showApp(autoLoginResult.user);
  } else {
    showLoginScreen();
  }
}

// ==================== Event Listeners ====================

document.addEventListener('DOMContentLoaded', () => {
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (autoLoginBtn) autoLoginBtn.addEventListener('click', handleAutoLogin);
  if (openPlatformBtn) openPlatformBtn.addEventListener('click', handleOpenPlatform);
  
  init();
});

// Update connection status periodically
setInterval(updateConnectionStatus, 10000);
