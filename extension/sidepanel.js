/**
 * Leedz Extension - Side Panel Script
 * Extension receives commands from platform via WebSocket - no local search UI
 */

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

// Job status elements
const activeJobSection = document.getElementById('activeJobSection');
const jobType = document.getElementById('jobType');
const jobProgress = document.getElementById('jobProgress');
const jobProgressBar = document.getElementById('jobProgressBar');
const recentResultsSection = document.getElementById('recentResultsSection');
const resultsCount = document.getElementById('resultsCount');
const resultsList = document.getElementById('resultsList');

// ==================== State ====================

let isLoading = false;
let platformConfig = null;
let currentJob = null;
let currentSearchType = 'BULK'; // 'SINGLE' or 'BULK'

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

function showLoadingScreen(message) {
  loadingContainer.classList.remove('hide');
  loginContainer.classList.add('hide');
  appContainer.classList.remove('show');
  if (message) loadingStatus.textContent = message;
}

function hideLoadingScreen() {
  loadingContainer.classList.add('hide');
}

function showApp(user) {
  hideLoadingScreen();
  loginContainer.classList.add('hide');
  appContainer.classList.add('show');
  
  if (user) {
    userName.textContent = user.name || user.email || 'المستخدم';
    userAvatar.textContent = (user.name || user.email || 'م').charAt(0).toUpperCase();
  }
  
  // Connect WebSocket after showing app
  sendMessage({ type: 'CONNECT_WEBSOCKET' });
  updateConnectionStatus();
}

function showLogin() {
  hideLoadingScreen();
  loginContainer.classList.remove('hide');
  appContainer.classList.remove('show');
  emailInput.value = '';
  passwordInput.value = '';
  hideError();
  
  // Show auto-login button if enabled
  if (platformConfig?.extensionAutoLogin) {
    autoLoginSection.style.display = 'block';
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

// ==================== Job Status Display ====================

function showActiveJob(job) {
  currentJob = job;
  if (activeJobSection) activeJobSection.style.display = 'block';
  
  const typeLabels = {
    'SEARCH_SINGLE': '🔍 بحث عن شركة',
    'SEARCH_BULK': '🔍 بحث متعدد',
    'google_maps': '🗺️ بحث Google Maps',
  };
  
  if (jobType) jobType.textContent = typeLabels[job.type] || job.type;
  if (jobProgress) jobProgress.textContent = job.status === 'RUNNING' ? 'جاري التنفيذ...' : job.status;
  if (jobProgressBar) jobProgressBar.style.width = `${job.progress || 0}%`;
}

function hideActiveJob() {
  currentJob = null;
  if (activeJobSection) activeJobSection.style.display = 'none';
}

function showResults(results) {
  if (recentResultsSection) recentResultsSection.style.display = 'block';
  if (resultsCount) resultsCount.textContent = results.length;
  
  if (!resultsList) return;
  
  if (results.length === 0) {
    resultsList.innerHTML = '<div style="text-align: center; padding: 16px; color: #64748b;">لم يتم العثور على نتائج</div>';
    return;
  }
  
  // Show search type indicator
  const searchTypeLabel = currentSearchType === 'SINGLE' ? '🏢 نتيجة البحث عن شركة' : '📋 نتائج البحث المتعدد';
  
  resultsList.innerHTML = `<div style="font-size: 12px; color: #3b82f6; margin-bottom: 8px; font-weight: 600;">${searchTypeLabel}</div>`;
  
  resultsList.innerHTML += results.slice(0, 10).map(r => `
    <div style="background: #f8fafc; border-radius: 8px; padding: 10px; margin-bottom: 6px;">
      <div style="font-weight: 600; color: #1e293b; font-size: 13px;">${r.name || 'بدون اسم'}</div>
      ${r.type ? `<div style="font-size: 11px; color: #64748b;">${r.type}</div>` : ''}
      ${r.address ? `<div style="font-size: 11px; color: #64748b;">📍 ${r.address.substring(0, 50)}${r.address.length > 50 ? '...' : ''}</div>` : ''}
      ${r.phone ? `<div style="font-size: 11px; color: #10b981;">📞 ${r.phone}</div>` : ''}
      ${r.rating ? `<div style="font-size: 11px; color: #f59e0b;">⭐ ${r.rating} ${r.reviews ? `(${r.reviews})` : ''}</div>` : ''}
      ${r.matchScore ? `<div style="font-size: 10px; color: #8b5cf6;">مطابقة: ${Math.round(r.matchScore)}%</div>` : ''}
    </div>
  `).join('');
  
  if (results.length > 10) {
    resultsList.innerHTML += `<div style="text-align: center; padding: 8px; color: #3b82f6; font-size: 12px;">+ ${results.length - 10} نتيجة أخرى في المنصة</div>`;
  }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'WS_CONNECTED' || message.type === 'WS_AUTHENTICATED' || message.type === 'POLLING_STARTED') {
    connectionStatus.className = 'status-badge connected';
    connectionStatus.innerHTML = '<span>●</span> متصل بالمنصة';
  } else if (message.type === 'WS_DISCONNECTED' || message.type === 'POLLING_STOPPED') {
    // Only show disconnected if polling also stopped
    if (message.type === 'POLLING_STOPPED') {
      connectionStatus.className = 'status-badge disconnected';
      connectionStatus.innerHTML = '<span>●</span> غير متصل';
    }
  } else if (message.type === 'JOB_STARTED') {
    showActiveJob(message.job);
  } else if (message.type === 'JOB_PROGRESS') {
    if (currentJob && jobProgressBar) {
      jobProgressBar.style.width = `${message.progress}%`;
      if (jobProgress) jobProgress.textContent = message.status || 'جاري التنفيذ...';
    }
  } else if (message.type === 'JOB_COMPLETED') {
    hideActiveJob();
    if (message.results) {
      showResults(message.results);
    }
  } else if (message.type === 'JOB_FAILED') {
    hideActiveJob();
    if (jobProgress) jobProgress.textContent = 'فشل: ' + (message.error || 'خطأ غير معروف');
  }
});

// ==================== Auth ====================

async function checkAuth() {
  showLoadingScreen('جاري التحقق من حالة تسجيل الدخول...');
  
  // Get platform config
  platformConfig = await sendMessage({ type: 'GET_PLATFORM_CONFIG' });
  
  // Check existing auth
  const response = await sendMessage({ type: 'GET_AUTH_STATE' });
  
  if (response?.isAuthenticated) {
    showLoadingScreen('جاري التحقق من صلاحية الجلسة...');
    const verifyResponse = await sendMessage({ type: 'VERIFY_TOKEN' });
    if (verifyResponse?.valid) {
      showApp(response.user);
      return;
    }
  }
  
  // Try auto-login from platform
  if (platformConfig?.extensionAutoLogin) {
    showLoadingScreen('جاري محاولة تسجيل الدخول التلقائي...');
    const autoLoginResult = await sendMessage({ type: 'CHECK_PLATFORM_LOGIN' });
    
    if (autoLoginResult?.success) {
      const authState = await sendMessage({ type: 'GET_AUTH_STATE' });
      showApp(authState.user);
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

async function handleAutoLogin() {
  autoLoginBtn.disabled = true;
  autoLoginBtnText.innerHTML = '<span class="spinner"></span> جاري التحقق...';
  
  try {
    const result = await sendMessage({ type: 'CHECK_PLATFORM_LOGIN' });
    
    if (result?.success) {
      const authState = await sendMessage({ type: 'GET_AUTH_STATE' });
      showApp(authState.user);
    } else if (result?.reason === 'not_logged_in') {
      // Open platform for login
      showError('يرجى تسجيل الدخول في المنصة أولاً');
      await sendMessage({ type: 'OPEN_PLATFORM' });
    } else {
      showError('فشل تسجيل الدخول التلقائي: ' + (result?.error || result?.reason || 'خطأ غير معروف'));
    }
  } catch (error) {
    showError('فشل الاتصال');
    console.error('Auto-login error:', error);
  } finally {
    autoLoginBtn.disabled = false;
    autoLoginBtnText.innerHTML = '🔗 تسجيل الدخول من المنصة';
  }
}

async function handleLogout() {
  await sendMessage({ type: 'LOGOUT' });
  showLogin();
}

async function handleOpenPlatform() {
  await sendMessage({ type: 'OPEN_PLATFORM' });
}

function updateSearchTypeUI() {
  const singleBtn = document.getElementById('searchTypeSingle');
  const bulkBtn = document.getElementById('searchTypeBulk');
  const testQuery = document.getElementById('testQuery');
  
  if (currentSearchType === 'SINGLE') {
    singleBtn.style.border = '2px solid #3b82f6';
    singleBtn.style.background = '#eff6ff';
    singleBtn.style.color = '#1d4ed8';
    bulkBtn.style.border = '2px solid #e2e8f0';
    bulkBtn.style.background = 'white';
    bulkBtn.style.color = 'inherit';
    testQuery.placeholder = 'اسم الشركة (مثال: شركة الحلول الذكية)';
  } else {
    bulkBtn.style.border = '2px solid #3b82f6';
    bulkBtn.style.background = '#eff6ff';
    bulkBtn.style.color = '#1d4ed8';
    singleBtn.style.border = '2px solid #e2e8f0';
    singleBtn.style.background = 'white';
    singleBtn.style.color = 'inherit';
    testQuery.placeholder = 'النشاط (مثال: مطاعم)';
  }
}

async function handleTestSearch() {
  const testQuery = document.getElementById('testQuery');
  const testCity = document.getElementById('testCity');
  const testSearchBtn = document.getElementById('testSearchBtn');
  
  const query = testQuery.value.trim();
  const city = testCity.value.trim();
  
  if (!query || !city) {
    alert('يرجى إدخال ' + (currentSearchType === 'SINGLE' ? 'اسم الشركة' : 'النشاط') + ' والمدينة');
    return;
  }
  
  testSearchBtn.disabled = true;
  testSearchBtn.textContent = '⏳ جاري البحث...';
  
  try {
    // Send test search command to background
    const result = await sendMessage({
      type: 'TEST_SEARCH',
      query,
      city,
      country: 'السعودية',
      searchType: currentSearchType,
    });
    
    console.log('[Leedz] Test search result:', result);
    
    if (result?.success) {
      testSearchBtn.textContent = '✅ تم البحث بنجاح!';
    } else {
      testSearchBtn.textContent = '❌ فشل البحث';
      alert('فشل البحث: ' + (result?.error || 'خطأ غير معروف'));
    }
  } catch (error) {
    console.error('[Leedz] Test search error:', error);
    testSearchBtn.textContent = '❌ خطأ';
    alert('خطأ: ' + error.message);
  } finally {
    setTimeout(() => {
      testSearchBtn.disabled = false;
      testSearchBtn.textContent = '🚀 بدء البحث التجريبي';
    }, 2000);
  }
}

// ==================== Event Listeners ====================

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
autoLoginBtn?.addEventListener('click', handleAutoLogin);
openPlatformBtn?.addEventListener('click', handleOpenPlatform);
document.getElementById('testSearchBtn')?.addEventListener('click', handleTestSearch);

// Search type toggle buttons
document.getElementById('searchTypeSingle')?.addEventListener('click', () => {
  currentSearchType = 'SINGLE';
  updateSearchTypeUI();
});
document.getElementById('searchTypeBulk')?.addEventListener('click', () => {
  currentSearchType = 'BULK';
  updateSearchTypeUI();
});

// ==================== Initialize ====================

checkAuth();
console.log('[Leedz Extension] Side panel initialized - Command receiver mode');
