/**
 * Leedz Extension - Side Panel Script
 * Handles UI interactions and communicates with background service worker
 */

// ==================== DOM Elements ====================

const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const connectionStatus = document.getElementById('connectionStatus');
const currentPageUrl = document.getElementById('currentPageUrl');
const logoutBtn = document.getElementById('logoutBtn');

// ==================== State ====================

let isLoading = false;

// ==================== Helpers ====================

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}

function showError(message) {
  loginError.textContent = message;
  loginError.classList.add('show');
}

function hideError() {
  loginError.classList.remove('show');
}

function setLoading(loading) {
  isLoading = loading;
  loginBtn.disabled = loading;
  loginBtnText.innerHTML = loading 
    ? '<span class="spinner"></span>' 
    : 'تسجيل الدخول';
}

function showApp(user) {
  loginContainer.classList.add('hide');
  appContainer.classList.add('show');
  
  if (user) {
    userName.textContent = user.name || user.email || 'المستخدم';
    userAvatar.textContent = (user.name || user.email || 'م').charAt(0).toUpperCase();
  }
  
  updateCurrentPage();
  
  // Connect WebSocket after showing app
  sendMessage({ type: 'CONNECT_WEBSOCKET' });
  updateConnectionStatus();
}

function showLogin() {
  loginContainer.classList.remove('hide');
  appContainer.classList.remove('show');
  emailInput.value = '';
  passwordInput.value = '';
  hideError();
}

async function updateCurrentPage() {
  try {
    const response = await sendMessage({ type: 'GET_CURRENT_TAB' });
    if (response?.tab?.url) {
      const url = response.tab.url;
      currentPageUrl.textContent = url.length > 60 ? url.substring(0, 60) + '...' : url;
    } else {
      currentPageUrl.textContent = 'لا يمكن قراءة الصفحة';
    }
  } catch (error) {
    currentPageUrl.textContent = 'خطأ في قراءة الصفحة';
  }
}

async function updateConnectionStatus() {
  try {
    const response = await sendMessage({ type: 'GET_WS_STATUS' });
    if (response?.connected) {
      connectionStatus.className = 'status-badge connected';
      connectionStatus.innerHTML = '<span>●</span> متصل بالمنصة';
    } else {
      connectionStatus.className = 'status-badge disconnected';
      connectionStatus.innerHTML = '<span>●</span> غير متصل';
    }
  } catch (error) {
    connectionStatus.className = 'status-badge disconnected';
    connectionStatus.innerHTML = '<span>●</span> خطأ في الاتصال';
  }
}

// Listen for WebSocket status updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'WS_CONNECTED' || message.type === 'WS_AUTHENTICATED') {
    connectionStatus.className = 'status-badge connected';
    connectionStatus.innerHTML = '<span>●</span> متصل بالمنصة';
  } else if (message.type === 'WS_DISCONNECTED') {
    connectionStatus.className = 'status-badge disconnected';
    connectionStatus.innerHTML = '<span>●</span> غير متصل';
  } else if (message.type === 'JOB_RECEIVED') {
    console.log('Job received:', message.payload);
    // Could show notification or update UI
  }
});

// ==================== Auth ====================

async function checkAuth() {
  const response = await sendMessage({ type: 'GET_AUTH_STATE' });
  
  if (response?.isAuthenticated) {
    // Verify token is still valid
    const verifyResponse = await sendMessage({ type: 'VERIFY_TOKEN' });
    if (verifyResponse?.valid) {
      showApp(response.user);
      return;
    }
  }
  
  showLogin();
}

async function handleLogin(e) {
  e.preventDefault();
  
  if (isLoading) return;
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    showError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
    return;
  }
  
  hideError();
  setLoading(true);
  
  try {
    const response = await sendMessage({
      type: 'LOGIN',
      email,
      password,
    });
    
    if (response?.error) {
      showError(response.error === 'Invalid credentials' 
        ? 'بيانات الدخول غير صحيحة' 
        : response.error);
      return;
    }
    
    if (response?.token) {
      showApp(response.user);
    } else {
      showError('حدث خطأ غير متوقع');
    }
  } catch (error) {
    showError('فشل الاتصال بالخادم');
    console.error('Login error:', error);
  } finally {
    setLoading(false);
  }
}

async function handleLogout() {
  await sendMessage({ type: 'LOGOUT' });
  showLogin();
}

// ==================== Event Listeners ====================

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

// Update current page when tab changes
chrome.tabs.onActivated?.addListener(() => {
  if (appContainer.classList.contains('show')) {
    updateCurrentPage();
  }
});

chrome.tabs.onUpdated?.addListener((tabId, changeInfo) => {
  if (changeInfo.url && appContainer.classList.contains('show')) {
    updateCurrentPage();
  }
});

// ==================== Initialize ====================

checkAuth();
console.log('[Leedz Extension] Side panel initialized');
